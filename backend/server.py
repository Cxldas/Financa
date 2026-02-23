from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from functools import wraps
import io
import csv
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fingestao-super-secret-key-2024')
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Timezone
BRAZIL_TZ = ZoneInfo("America/Bahia")

# Rate limiting storage (in production, use Redis)
login_attempts = {}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="FinGestão API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Auth"])
categories_router = APIRouter(prefix="/categories", tags=["Categories"])
transactions_router = APIRouter(prefix="/transactions", tags=["Transactions"])
reports_router = APIRouter(prefix="/reports", tags=["Reports"])
goals_router = APIRouter(prefix="/goals", tags=["Goals"])

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Senha deve conter pelo menos 1 letra maiúscula')
        if not any(c.islower() for c in v):
            raise ValueError('Senha deve conter pelo menos 1 letra minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('Senha deve conter pelo menos 1 número')
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Senhas não conferem')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    theme: str = "dark"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    type: Literal["INCOME", "EXPENSE", "BOTH"]
    color: str = Field(default="#6366f1", pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    type: Optional[Literal["INCOME", "EXPENSE", "BOTH"]] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None

class CategoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    type: str
    color: str
    icon: Optional[str]
    created_at: datetime

class TransactionBase(BaseModel):
    type: Literal["INCOME", "EXPENSE"]
    description: str = Field(..., min_length=3, max_length=120)
    amount: float = Field(..., gt=0)
    date: datetime
    category_id: str
    payment_method: Optional[Literal["CASH", "DEBIT", "CREDIT", "PIX", "TRANSFER"]] = None
    notes: Optional[str] = Field(None, max_length=500)

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    type: Optional[Literal["INCOME", "EXPENSE"]] = None
    description: Optional[str] = Field(None, min_length=3, max_length=120)
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[datetime] = None
    category_id: Optional[str] = None
    payment_method: Optional[Literal["CASH", "DEBIT", "CREDIT", "PIX", "TRANSFER"]] = None
    notes: Optional[str] = Field(None, max_length=500)

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    type: str
    description: str
    amount: float
    date: datetime
    category_id: str
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    payment_method: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class GoalBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: Optional[datetime] = None
    icon: Optional[str] = None
    color: str = Field(default="#6366f1", pattern=r'^#[0-9A-Fa-f]{6}$')

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[datetime] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')

class GoalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    target_amount: float
    current_amount: float
    progress: float
    deadline: Optional[datetime]
    icon: Optional[str]
    color: str
    created_at: datetime

class MonthlyReportResponse(BaseModel):
    month: int
    year: int
    total_income: float
    total_expense: float
    balance: float
    income_change: Optional[float]
    expense_change: Optional[float]
    top_expense_categories: List[dict]
    daily_balance: List[dict]

class DashboardResponse(BaseModel):
    current_balance: float
    total_income: float
    total_expense: float
    income_vs_expense_change: float
    expenses_by_category: List[dict]
    income_vs_expense_daily: List[dict]
    monthly_comparison: List[dict]
    recent_transactions: List[TransactionResponse]

class UserSettingsUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    theme: Optional[Literal["dark", "light"]] = None

# ==================== AUTH HELPERS ====================

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh", "jti": str(uuid.uuid4())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    return user

def check_rate_limit(email: str) -> bool:
    now = datetime.now(timezone.utc)
    if email in login_attempts:
        attempts, last_attempt = login_attempts[email]
        if now - last_attempt < timedelta(minutes=15):
            if attempts >= 5:
                return False
    return True

def record_login_attempt(email: str, success: bool):
    now = datetime.now(timezone.utc)
    if success:
        login_attempts.pop(email, None)
    else:
        if email in login_attempts:
            attempts, _ = login_attempts[email]
            login_attempts[email] = (attempts + 1, now)
        else:
            login_attempts[email] = (1, now)

# Default categories for new users
DEFAULT_CATEGORIES = [
    {"name": "Alimentação", "type": "EXPENSE", "color": "#ef4444", "icon": "utensils"},
    {"name": "Transporte", "type": "EXPENSE", "color": "#f59e0b", "icon": "car"},
    {"name": "Moradia", "type": "EXPENSE", "color": "#8b5cf6", "icon": "home"},
    {"name": "Saúde", "type": "EXPENSE", "color": "#ec4899", "icon": "heart-pulse"},
    {"name": "Educação", "type": "EXPENSE", "color": "#3b82f6", "icon": "graduation-cap"},
    {"name": "Lazer", "type": "EXPENSE", "color": "#14b8a6", "icon": "gamepad-2"},
    {"name": "Assinaturas", "type": "EXPENSE", "color": "#6366f1", "icon": "tv"},
    {"name": "Investimentos", "type": "BOTH", "color": "#10b981", "icon": "trending-up"},
    {"name": "Salário", "type": "INCOME", "color": "#22c55e", "icon": "wallet"},
    {"name": "Freelance", "type": "INCOME", "color": "#06b6d4", "icon": "laptop"},
    {"name": "Outros", "type": "BOTH", "color": "#71717a", "icon": "more-horizontal"},
]

async def create_default_categories(user_id: str):
    now = datetime.now(timezone.utc).isoformat()
    categories = []
    for cat in DEFAULT_CATEGORIES:
        categories.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": cat["name"],
            "type": cat["type"],
            "color": cat["color"],
            "icon": cat["icon"],
            "created_at": now
        })
    if categories:
        await db.categories.insert_many(categories)

# ==================== AUTH ROUTES ====================

@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    now = datetime.now(timezone.utc)
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "password": pwd_context.hash(user_data.password),
        "theme": "dark",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await create_default_categories(user_id)
    
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Store refresh token
    await db.refresh_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "token": refresh_token,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()
    })
    
    logger.info(f"New user registered: {user_data.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email.lower(),
            name=user_data.name,
            theme="dark",
            created_at=now
        )
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    email = credentials.email.lower()
    
    if not check_rate_limit(email):
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em 15 minutos.")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        record_login_attempt(email, False)
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    record_login_attempt(email, True)
    
    access_token = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])
    
    now = datetime.now(timezone.utc)
    await db.refresh_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "token": refresh_token,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()
    })
    
    logger.info(f"User logged in: {email}")
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            theme=user.get("theme", "dark"),
            created_at=created_at
        )
    )

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest):
    try:
        payload = jwt.decode(data.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Verify token exists in DB
    stored_token = await db.refresh_tokens.find_one({"token": data.refresh_token, "user_id": user_id})
    if not stored_token:
        raise HTTPException(status_code=401, detail="Token inválido ou revogado")
    
    # Delete old refresh token
    await db.refresh_tokens.delete_one({"token": data.refresh_token})
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    # Create new tokens
    access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    
    now = datetime.now(timezone.utc)
    await db.refresh_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "token": new_refresh_token,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()
    })
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            theme=user.get("theme", "dark"),
            created_at=created_at
        )
    )

@auth_router.post("/logout")
async def logout(data: RefreshTokenRequest):
    await db.refresh_tokens.delete_one({"token": data.refresh_token})
    return {"message": "Logout realizado com sucesso"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    created_at = current_user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        theme=current_user.get("theme", "dark"),
        created_at=created_at
    )

@auth_router.patch("/settings", response_model=UserResponse)
async def update_settings(settings: UserSettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if settings.name is not None:
        update_data["name"] = settings.name
    if settings.theme is not None:
        update_data["theme"] = settings.theme
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        theme=user.get("theme", "dark"),
        created_at=created_at
    )

# ==================== CATEGORIES ROUTES ====================

@categories_router.get("", response_model=List[CategoryResponse])
async def list_categories(
    type: Optional[Literal["INCOME", "EXPENSE", "BOTH"]] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if type:
        query["$or"] = [{"type": type}, {"type": "BOTH"}]
    
    categories = await db.categories.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    result = []
    for cat in categories:
        created_at = cat.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        result.append(CategoryResponse(
            id=cat["id"],
            user_id=cat["user_id"],
            name=cat["name"],
            type=cat["type"],
            color=cat["color"],
            icon=cat.get("icon"),
            created_at=created_at
        ))
    
    return result

@categories_router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check unique name for user (case-insensitive)
    existing = await db.categories.find_one({
        "user_id": current_user["id"],
        "name": {"$regex": f"^{category.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    
    now = datetime.now(timezone.utc)
    cat_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": category.name,
        "type": category.type,
        "color": category.color,
        "icon": category.icon,
        "created_at": now.isoformat()
    }
    
    await db.categories.insert_one(cat_doc)
    
    return CategoryResponse(
        id=cat_doc["id"],
        user_id=cat_doc["user_id"],
        name=cat_doc["name"],
        type=cat_doc["type"],
        color=cat_doc["color"],
        icon=cat_doc["icon"],
        created_at=now
    )

@categories_router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    category = await db.categories.find_one(
        {"id": category_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    created_at = category.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return CategoryResponse(
        id=category["id"],
        user_id=category["user_id"],
        name=category["name"],
        type=category["type"],
        color=category["color"],
        icon=category.get("icon"),
        created_at=created_at
    )

@categories_router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    update: CategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    category = await db.categories.find_one(
        {"id": category_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    update_data = update.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        existing = await db.categories.find_one({
            "user_id": current_user["id"],
            "name": {"$regex": f"^{update_data['name']}$", "$options": "i"},
            "id": {"$ne": category_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Categoria já existe")
    
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    created_at = updated.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return CategoryResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        name=updated["name"],
        type=updated["type"],
        color=updated["color"],
        icon=updated.get("icon"),
        created_at=created_at
    )

@categories_router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    reassign_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    category = await db.categories.find_one(
        {"id": category_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Check for transactions
    tx_count = await db.transactions.count_documents({
        "category_id": category_id,
        "user_id": current_user["id"],
        "deleted_at": None
    })
    
    if tx_count > 0:
        if not reassign_to:
            raise HTTPException(
                status_code=400,
                detail=f"Categoria possui {tx_count} transações. Forneça uma categoria para reatribuir."
            )
        
        # Verify reassign category exists
        reassign_cat = await db.categories.find_one({
            "id": reassign_to,
            "user_id": current_user["id"]
        })
        if not reassign_cat:
            raise HTTPException(status_code=400, detail="Categoria de reatribuição não encontrada")
        
        # Reassign transactions
        await db.transactions.update_many(
            {"category_id": category_id, "user_id": current_user["id"]},
            {"$set": {"category_id": reassign_to}}
        )
    
    await db.categories.delete_one({"id": category_id})
    return {"message": "Categoria deletada com sucesso"}

# ==================== TRANSACTIONS ROUTES ====================

@transactions_router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[Literal["INCOME", "EXPENSE"]] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Literal["date", "amount", "created_at"] = "date",
    sort_order: Literal["asc", "desc"] = "desc",
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"], "deleted_at": None}
    
    # Date filter
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date + "T23:59:59"
        query["date"] = date_query
    else:
        # Default: last 30 days
        end = datetime.now(BRAZIL_TZ)
        start = end - timedelta(days=30)
        query["date"] = {"$gte": start.isoformat(), "$lte": end.isoformat()}
    
    if type:
        query["type"] = type
    
    if category_id:
        query["category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    # Count total
    total = await db.transactions.count_documents(query)
    
    # Sort
    sort_dir = 1 if sort_order == "asc" else -1
    sort_field = sort_by if sort_by != "created_at" else "created_at"
    
    # Fetch with pagination
    skip = (page - 1) * page_size
    transactions = await db.transactions.find(query, {"_id": 0}).sort(sort_field, sort_dir).skip(skip).limit(page_size).to_list(page_size)
    
    # Get categories for names
    cat_ids = list(set(t["category_id"] for t in transactions))
    categories = {}
    if cat_ids:
        cats = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(len(cat_ids))
        categories = {c["id"]: c for c in cats}
    
    result = []
    for t in transactions:
        cat = categories.get(t["category_id"], {})
        date_val = t.get("date")
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
        created_at = t.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        updated_at = t.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        result.append(TransactionResponse(
            id=t["id"],
            user_id=t["user_id"],
            type=t["type"],
            description=t["description"],
            amount=t["amount"],
            date=date_val,
            category_id=t["category_id"],
            category_name=cat.get("name"),
            category_color=cat.get("color"),
            payment_method=t.get("payment_method"),
            notes=t.get("notes"),
            created_at=created_at,
            updated_at=updated_at
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return TransactionListResponse(
        items=result,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@transactions_router.post("", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify category exists and belongs to user
    category = await db.categories.find_one({
        "id": transaction.category_id,
        "user_id": current_user["id"]
    }, {"_id": 0})
    
    if not category:
        raise HTTPException(status_code=400, detail="Categoria não encontrada")
    
    # Verify category type matches transaction type
    if category["type"] != "BOTH" and category["type"] != transaction.type:
        raise HTTPException(status_code=400, detail="Tipo de categoria incompatível com o tipo de transação")
    
    now = datetime.now(timezone.utc)
    tx_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": transaction.type,
        "description": transaction.description,
        "amount": round(transaction.amount, 2),
        "date": transaction.date.isoformat(),
        "category_id": transaction.category_id,
        "payment_method": transaction.payment_method,
        "notes": transaction.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "deleted_at": None
    }
    
    await db.transactions.insert_one(tx_doc)
    
    return TransactionResponse(
        id=tx_doc["id"],
        user_id=tx_doc["user_id"],
        type=tx_doc["type"],
        description=tx_doc["description"],
        amount=tx_doc["amount"],
        date=transaction.date,
        category_id=tx_doc["category_id"],
        category_name=category["name"],
        category_color=category["color"],
        payment_method=tx_doc["payment_method"],
        notes=tx_doc["notes"],
        created_at=now,
        updated_at=now
    )

@transactions_router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "user_id": current_user["id"], "deleted_at": None},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    category = await db.categories.find_one({"id": transaction["category_id"]}, {"_id": 0})
    
    date_val = transaction.get("date")
    if isinstance(date_val, str):
        date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
    created_at = transaction.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    updated_at = transaction.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
    
    return TransactionResponse(
        id=transaction["id"],
        user_id=transaction["user_id"],
        type=transaction["type"],
        description=transaction["description"],
        amount=transaction["amount"],
        date=date_val,
        category_id=transaction["category_id"],
        category_name=category["name"] if category else None,
        category_color=category["color"] if category else None,
        payment_method=transaction.get("payment_method"),
        notes=transaction.get("notes"),
        created_at=created_at,
        updated_at=updated_at
    )

@transactions_router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    update: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "user_id": current_user["id"], "deleted_at": None},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    update_data = update.model_dump(exclude_unset=True)
    
    if "category_id" in update_data:
        category = await db.categories.find_one({
            "id": update_data["category_id"],
            "user_id": current_user["id"]
        })
        if not category:
            raise HTTPException(status_code=400, detail="Categoria não encontrada")
    
    if "date" in update_data and update_data["date"]:
        update_data["date"] = update_data["date"].isoformat()
    
    if "amount" in update_data:
        update_data["amount"] = round(update_data["amount"], 2)
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    updated = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    category = await db.categories.find_one({"id": updated["category_id"]}, {"_id": 0})
    
    date_val = updated.get("date")
    if isinstance(date_val, str):
        date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
    created_at = updated.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    updated_at = updated.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
    
    return TransactionResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        type=updated["type"],
        description=updated["description"],
        amount=updated["amount"],
        date=date_val,
        category_id=updated["category_id"],
        category_name=category["name"] if category else None,
        category_color=category["color"] if category else None,
        payment_method=updated.get("payment_method"),
        notes=updated.get("notes"),
        created_at=created_at,
        updated_at=updated_at
    )

@transactions_router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "user_id": current_user["id"], "deleted_at": None},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Soft delete
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Transação deletada com sucesso"}

# ==================== REPORTS ROUTES ====================

@reports_router.get("/monthly", response_model=MonthlyReportResponse)
async def get_monthly_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    current_user: dict = Depends(get_current_user)
):
    # Calculate date range for current month
    start_date = datetime(year, month, 1, tzinfo=BRAZIL_TZ)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
    
    # Get transactions for current month
    query = {
        "user_id": current_user["id"],
        "deleted_at": None,
        "date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "INCOME")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "EXPENSE")
    balance = total_income - total_expense
    
    # Previous month for comparison
    if month == 1:
        prev_month, prev_year = 12, year - 1
    else:
        prev_month, prev_year = month - 1, year
    
    prev_start = datetime(prev_year, prev_month, 1, tzinfo=BRAZIL_TZ)
    if prev_month == 12:
        prev_end = datetime(prev_year + 1, 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
    else:
        prev_end = datetime(prev_year, prev_month + 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
    
    prev_query = {
        "user_id": current_user["id"],
        "deleted_at": None,
        "date": {"$gte": prev_start.isoformat(), "$lte": prev_end.isoformat()}
    }
    
    prev_transactions = await db.transactions.find(prev_query, {"_id": 0}).to_list(10000)
    prev_income = sum(t["amount"] for t in prev_transactions if t["type"] == "INCOME")
    prev_expense = sum(t["amount"] for t in prev_transactions if t["type"] == "EXPENSE")
    
    income_change = ((total_income - prev_income) / prev_income * 100) if prev_income > 0 else None
    expense_change = ((total_expense - prev_expense) / prev_expense * 100) if prev_expense > 0 else None
    
    # Top expense categories
    expense_by_category = {}
    for t in transactions:
        if t["type"] == "EXPENSE":
            cat_id = t["category_id"]
            expense_by_category[cat_id] = expense_by_category.get(cat_id, 0) + t["amount"]
    
    # Get category names
    cat_ids = list(expense_by_category.keys())
    categories = {}
    if cat_ids:
        cats = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(len(cat_ids))
        categories = {c["id"]: c for c in cats}
    
    top_categories = sorted(
        [{"category_id": k, "name": categories.get(k, {}).get("name", "Desconhecida"), "color": categories.get(k, {}).get("color", "#71717a"), "amount": v} 
         for k, v in expense_by_category.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]
    
    # Daily balance evolution
    daily_data = {}
    for t in transactions:
        date_str = t["date"][:10]
        if date_str not in daily_data:
            daily_data[date_str] = {"income": 0, "expense": 0}
        if t["type"] == "INCOME":
            daily_data[date_str]["income"] += t["amount"]
        else:
            daily_data[date_str]["expense"] += t["amount"]
    
    daily_balance = [
        {"date": k, "income": v["income"], "expense": v["expense"], "balance": v["income"] - v["expense"]}
        for k, v in sorted(daily_data.items())
    ]
    
    return MonthlyReportResponse(
        month=month,
        year=year,
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        balance=round(balance, 2),
        income_change=round(income_change, 2) if income_change is not None else None,
        expense_change=round(expense_change, 2) if expense_change is not None else None,
        top_expense_categories=top_categories,
        daily_balance=daily_balance
    )

@reports_router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Default: current month
    now = datetime.now(BRAZIL_TZ)
    if not start_date:
        start_date = datetime(now.year, now.month, 1, tzinfo=BRAZIL_TZ).isoformat()
    if not end_date:
        if now.month == 12:
            end_date = (datetime(now.year + 1, 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)).isoformat()
        else:
            end_date = (datetime(now.year, now.month + 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)).isoformat()
    
    # Get all user transactions (for total balance)
    all_transactions = await db.transactions.find(
        {"user_id": current_user["id"], "deleted_at": None},
        {"_id": 0}
    ).to_list(100000)
    
    total_all_income = sum(t["amount"] for t in all_transactions if t["type"] == "INCOME")
    total_all_expense = sum(t["amount"] for t in all_transactions if t["type"] == "EXPENSE")
    current_balance = total_all_income - total_all_expense
    
    # Period transactions
    period_query = {
        "user_id": current_user["id"],
        "deleted_at": None,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    period_transactions = await db.transactions.find(period_query, {"_id": 0}).to_list(10000)
    
    total_income = sum(t["amount"] for t in period_transactions if t["type"] == "INCOME")
    total_expense = sum(t["amount"] for t in period_transactions if t["type"] == "EXPENSE")
    
    # Previous period comparison (same duration before start_date)
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    period_days = (end_dt - start_dt).days + 1
    
    prev_end = start_dt - timedelta(seconds=1)
    prev_start = prev_end - timedelta(days=period_days)
    
    prev_query = {
        "user_id": current_user["id"],
        "deleted_at": None,
        "date": {"$gte": prev_start.isoformat(), "$lte": prev_end.isoformat()}
    }
    prev_transactions = await db.transactions.find(prev_query, {"_id": 0}).to_list(10000)
    
    prev_income = sum(t["amount"] for t in prev_transactions if t["type"] == "INCOME")
    prev_expense = sum(t["amount"] for t in prev_transactions if t["type"] == "EXPENSE")
    prev_balance = prev_income - prev_expense
    current_period_balance = total_income - total_expense
    
    if prev_balance != 0:
        income_vs_expense_change = ((current_period_balance - prev_balance) / abs(prev_balance)) * 100
    else:
        income_vs_expense_change = 100 if current_period_balance > 0 else 0
    
    # Expenses by category
    expense_by_category = {}
    for t in period_transactions:
        if t["type"] == "EXPENSE":
            cat_id = t["category_id"]
            expense_by_category[cat_id] = expense_by_category.get(cat_id, 0) + t["amount"]
    
    cat_ids = list(expense_by_category.keys())
    categories = {}
    if cat_ids:
        cats = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(len(cat_ids))
        categories = {c["id"]: c for c in cats}
    
    expenses_by_cat = [
        {"category_id": k, "name": categories.get(k, {}).get("name", "Outros"), "color": categories.get(k, {}).get("color", "#71717a"), "amount": v}
        for k, v in expense_by_category.items()
    ]
    
    # Daily income vs expense
    daily_data = {}
    for t in period_transactions:
        date_str = t["date"][:10]
        if date_str not in daily_data:
            daily_data[date_str] = {"income": 0, "expense": 0}
        if t["type"] == "INCOME":
            daily_data[date_str]["income"] += t["amount"]
        else:
            daily_data[date_str]["expense"] += t["amount"]
    
    income_vs_expense_daily = [
        {"date": k, "income": round(v["income"], 2), "expense": round(v["expense"], 2)}
        for k, v in sorted(daily_data.items())
    ]
    
    # Monthly comparison (last 6 months)
    monthly_comparison = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        
        m_start = datetime(y, m, 1, tzinfo=BRAZIL_TZ)
        if m == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
        else:
            m_end = datetime(y, m + 1, 1, tzinfo=BRAZIL_TZ) - timedelta(seconds=1)
        
        m_income = sum(t["amount"] for t in all_transactions if t["type"] == "INCOME" and m_start.isoformat() <= t["date"] <= m_end.isoformat())
        m_expense = sum(t["amount"] for t in all_transactions if t["type"] == "EXPENSE" and m_start.isoformat() <= t["date"] <= m_end.isoformat())
        
        month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        monthly_comparison.append({
            "month": month_names[m - 1],
            "year": y,
            "income": round(m_income, 2),
            "expense": round(m_expense, 2)
        })
    
    # Recent transactions
    recent = await db.transactions.find(
        {"user_id": current_user["id"], "deleted_at": None},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    recent_cat_ids = list(set(t["category_id"] for t in recent))
    recent_categories = {}
    if recent_cat_ids:
        rcats = await db.categories.find({"id": {"$in": recent_cat_ids}}, {"_id": 0}).to_list(len(recent_cat_ids))
        recent_categories = {c["id"]: c for c in rcats}
    
    recent_transactions = []
    for t in recent:
        cat = recent_categories.get(t["category_id"], {})
        date_val = t.get("date")
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
        created_at = t.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        updated_at = t.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        recent_transactions.append(TransactionResponse(
            id=t["id"],
            user_id=t["user_id"],
            type=t["type"],
            description=t["description"],
            amount=t["amount"],
            date=date_val,
            category_id=t["category_id"],
            category_name=cat.get("name"),
            category_color=cat.get("color"),
            payment_method=t.get("payment_method"),
            notes=t.get("notes"),
            created_at=created_at,
            updated_at=updated_at
        ))
    
    return DashboardResponse(
        current_balance=round(current_balance, 2),
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        income_vs_expense_change=round(income_vs_expense_change, 2),
        expenses_by_category=expenses_by_cat,
        income_vs_expense_daily=income_vs_expense_daily,
        monthly_comparison=monthly_comparison,
        recent_transactions=recent_transactions
    )

@reports_router.get("/export")
async def export_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[Literal["INCOME", "EXPENSE"]] = None,
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"], "deleted_at": None}
    
    now = datetime.now(BRAZIL_TZ)
    if not start_date:
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")
    
    query["date"] = {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    
    if type:
        query["type"] = type
    
    if category_id:
        query["category_id"] = category_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(100000)
    
    # Get category names
    cat_ids = list(set(t["category_id"] for t in transactions))
    categories = {}
    if cat_ids:
        cats = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(len(cat_ids))
        categories = {c["id"]: c["name"] for c in cats}
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["Data", "Tipo", "Descrição", "Categoria", "Valor", "Método de Pagamento", "Observações"])
    
    for t in transactions:
        date_str = t["date"][:10] if isinstance(t["date"], str) else t["date"].strftime("%Y-%m-%d")
        tipo = "Receita" if t["type"] == "INCOME" else "Despesa"
        categoria = categories.get(t["category_id"], "Desconhecida")
        valor = f"{t['amount']:.2f}".replace(".", ",")
        metodo = t.get("payment_method") or ""
        metodo_map = {"CASH": "Dinheiro", "DEBIT": "Débito", "CREDIT": "Crédito", "PIX": "PIX", "TRANSFER": "Transferência"}
        metodo = metodo_map.get(metodo, metodo)
        notas = t.get("notes") or ""
        
        writer.writerow([date_str, tipo, t["description"], categoria, valor, metodo, notas])
    
    output.seek(0)
    filename = f"transacoes_{start_date}_ate_{end_date}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== GOALS ROUTES ====================

@goals_router.get("", response_model=List[GoalResponse])
async def list_goals(current_user: dict = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for g in goals:
        created_at = g.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        deadline = g.get("deadline")
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
        
        progress = (g["current_amount"] / g["target_amount"] * 100) if g["target_amount"] > 0 else 0
        
        result.append(GoalResponse(
            id=g["id"],
            user_id=g["user_id"],
            name=g["name"],
            target_amount=g["target_amount"],
            current_amount=g["current_amount"],
            progress=round(min(progress, 100), 2),
            deadline=deadline,
            icon=g.get("icon"),
            color=g["color"],
            created_at=created_at
        ))
    
    return result

@goals_router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal: GoalCreate,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    goal_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": goal.name,
        "target_amount": round(goal.target_amount, 2),
        "current_amount": round(goal.current_amount, 2),
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
        "icon": goal.icon,
        "color": goal.color,
        "created_at": now.isoformat()
    }
    
    await db.goals.insert_one(goal_doc)
    
    progress = (goal_doc["current_amount"] / goal_doc["target_amount"] * 100) if goal_doc["target_amount"] > 0 else 0
    
    return GoalResponse(
        id=goal_doc["id"],
        user_id=goal_doc["user_id"],
        name=goal_doc["name"],
        target_amount=goal_doc["target_amount"],
        current_amount=goal_doc["current_amount"],
        progress=round(min(progress, 100), 2),
        deadline=goal.deadline,
        icon=goal_doc["icon"],
        color=goal_doc["color"],
        created_at=now
    )

@goals_router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    goal = await db.goals.find_one(
        {"id": goal_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    created_at = goal.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    deadline = goal.get("deadline")
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    
    progress = (goal["current_amount"] / goal["target_amount"] * 100) if goal["target_amount"] > 0 else 0
    
    return GoalResponse(
        id=goal["id"],
        user_id=goal["user_id"],
        name=goal["name"],
        target_amount=goal["target_amount"],
        current_amount=goal["current_amount"],
        progress=round(min(progress, 100), 2),
        deadline=deadline,
        icon=goal.get("icon"),
        color=goal["color"],
        created_at=created_at
    )

@goals_router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    update: GoalUpdate,
    current_user: dict = Depends(get_current_user)
):
    goal = await db.goals.find_one(
        {"id": goal_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    update_data = update.model_dump(exclude_unset=True)
    
    if "target_amount" in update_data:
        update_data["target_amount"] = round(update_data["target_amount"], 2)
    if "current_amount" in update_data:
        update_data["current_amount"] = round(update_data["current_amount"], 2)
    if "deadline" in update_data and update_data["deadline"]:
        update_data["deadline"] = update_data["deadline"].isoformat()
    
    if update_data:
        await db.goals.update_one({"id": goal_id}, {"$set": update_data})
    
    updated = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    created_at = updated.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    deadline = updated.get("deadline")
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    
    progress = (updated["current_amount"] / updated["target_amount"] * 100) if updated["target_amount"] > 0 else 0
    
    return GoalResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        name=updated["name"],
        target_amount=updated["target_amount"],
        current_amount=updated["current_amount"],
        progress=round(min(progress, 100), 2),
        deadline=deadline,
        icon=updated.get("icon"),
        color=updated["color"],
        created_at=created_at
    )

@goals_router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    goal = await db.goals.find_one(
        {"id": goal_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    await db.goals.delete_one({"id": goal_id})
    return {"message": "Meta deletada com sucesso"}

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== INCLUDE ROUTERS ====================

api_router.include_router(auth_router)
api_router.include_router(categories_router)
api_router.include_router(transactions_router)
api_router.include_router(reports_router)
api_router.include_router(goals_router)

app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.categories.create_index([("user_id", 1), ("name", 1)])
    await db.categories.create_index("id", unique=True)
    await db.transactions.create_index([("user_id", 1), ("date", -1)])
    await db.transactions.create_index([("user_id", 1), ("category_id", 1)])
    await db.transactions.create_index([("user_id", 1), ("type", 1)])
    await db.transactions.create_index("id", unique=True)
    await db.goals.create_index([("user_id", 1)])
    await db.goals.create_index("id", unique=True)
    await db.refresh_tokens.create_index("token")
    await db.refresh_tokens.create_index([("user_id", 1)])
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

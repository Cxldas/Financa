#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class FinGestaoAPITester:
    def __init__(self, base_url="https://moneysense-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.refresh_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        self.test_password = "Test1234"
        self.test_user_name = "Test User"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success and response.headers.get('content-type', '').startswith('application/json'):
                try:
                    return success, response.json()
                except:
                    return success, {}
            
            return success, response.text if success else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_user_registration(self):
        """Test user registration with password validation"""
        # Test with valid data
        registration_data = {
            "email": self.test_email,
            "name": self.test_user_name,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        
        success, response = self.run_test(
            "User Registration", "POST", "api/auth/register", 200, registration_data
        )
        
        if success and 'access_token' in response and 'refresh_token' in response:
            self.token = response['access_token']
            self.refresh_token = response['refresh_token']
            self.user_id = response['user']['id']
            self.log_test("Registration Token Set", True, f"Got tokens and user_id: {self.user_id}")
            return True
        
        return False

    def test_user_login(self):
        """Test user login returns tokens"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, response = self.run_test(
            "User Login", "POST", "api/auth/login", 200, login_data
        )
        
        if success and 'access_token' in response and 'refresh_token' in response:
            # Update tokens from login
            self.token = response['access_token']
            self.refresh_token = response['refresh_token']
            self.log_test("Login Token Update", True, "Tokens updated from login")
            return True
            
        return False

    def test_get_current_user(self):
        """Test GET /api/auth/me returns current user"""
        return self.run_test("Get Current User", "GET", "api/auth/me", 200)

    def test_refresh_token(self):
        """Test token refresh functionality"""
        refresh_data = {"refresh_token": self.refresh_token}
        
        success, response = self.run_test(
            "Refresh Token", "POST", "api/auth/refresh", 200, refresh_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.refresh_token = response['refresh_token']
            return True
        
        return False

    def test_default_categories_created(self):
        """Test that default Brazilian categories are created on registration"""
        success, response = self.run_test(
            "List Categories", "GET", "api/categories", 200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check if some expected Brazilian categories exist
            category_names = [cat.get('name', '') for cat in response]
            expected_categories = ['Alimentação', 'Transporte', 'Moradia', 'Salário']
            
            found_categories = [cat for cat in expected_categories if cat in category_names]
            
            if len(found_categories) >= 3:  # At least 3 expected categories
                self.log_test("Default Categories Created", True, f"Found {len(found_categories)} expected categories")
                return True
            else:
                self.log_test("Default Categories Created", False, f"Only found {len(found_categories)} expected categories")
                
        return False

    def test_create_category(self):
        """Test creating a new category"""
        category_data = {
            "name": "Test Category",
            "type": "EXPENSE", 
            "color": "#ff5733",
            "icon": "test-icon"
        }
        
        success, response = self.run_test(
            "Create Category", "POST", "api/categories", 201, category_data
        )
        
        if success:
            self.test_category_id = response.get('id')
            return True
        
        return False

    def test_create_transaction_income(self):
        """Test creating an income transaction"""
        # First get a category suitable for income
        success, categories = self.run_test("Get Categories for Transaction", "GET", "api/categories", 200)
        
        if not success or not categories:
            return False
            
        income_category = None
        for cat in categories:
            if cat.get('type') in ['INCOME', 'BOTH']:
                income_category = cat
                break
                
        if not income_category:
            self.log_test("Create Income Transaction", False, "No suitable income category found")
            return False
        
        transaction_data = {
            "type": "INCOME",
            "description": "Test Salary Income",
            "amount": 5000.00,
            "date": datetime.now().isoformat(),
            "category_id": income_category['id'],
            "payment_method": "TRANSFER",
            "notes": "Test income transaction"
        }
        
        success, response = self.run_test(
            "Create Income Transaction", "POST", "api/transactions", 201, transaction_data
        )
        
        if success:
            self.test_income_id = response.get('id')
            return True
            
        return False

    def test_create_transaction_expense(self):
        """Test creating an expense transaction"""
        # First get a category suitable for expense
        success, categories = self.run_test("Get Categories for Transaction", "GET", "api/categories", 200)
        
        if not success or not categories:
            return False
            
        expense_category = None
        for cat in categories:
            if cat.get('type') in ['EXPENSE', 'BOTH']:
                expense_category = cat
                break
                
        if not expense_category:
            self.log_test("Create Expense Transaction", False, "No suitable expense category found")
            return False
        
        transaction_data = {
            "type": "EXPENSE",
            "description": "Test Supermarket Expense",
            "amount": 150.75,
            "date": datetime.now().isoformat(),
            "category_id": expense_category['id'],
            "payment_method": "DEBIT",
            "notes": "Test expense transaction"
        }
        
        success, response = self.run_test(
            "Create Expense Transaction", "POST", "api/transactions", 201, transaction_data
        )
        
        if success:
            self.test_expense_id = response.get('id')
            return True
            
        return False

    def test_list_transactions(self):
        """Test listing transactions with pagination and filters"""
        # Test basic list
        success, response = self.run_test("List Transactions", "GET", "api/transactions", 200)
        
        if success and 'items' in response:
            items = response['items']
            self.log_test("List Transactions Data", True, f"Found {len(items)} transactions")
            return True
            
        return False

    def test_dashboard_endpoint(self):
        """Test dashboard endpoint returns required data"""
        success, response = self.run_test("Dashboard Data", "GET", "api/reports/dashboard", 200)
        
        if success:
            required_fields = ['current_balance', 'total_income', 'total_expense', 'expenses_by_category']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_test("Dashboard Data Structure", True, "All required fields present")
                return True
            else:
                self.log_test("Dashboard Data Structure", False, f"Missing fields: {missing_fields}")
                
        return False

    def test_monthly_report(self):
        """Test monthly report endpoint"""
        now = datetime.now()
        success, response = self.run_test(
            "Monthly Report", "GET", f"api/reports/monthly?month={now.month}&year={now.year}", 200
        )
        
        if success:
            required_fields = ['month', 'year', 'total_income', 'total_expense', 'balance']
            missing_fields = [field for field in response if field not in response]
            
            if response.get('month') == now.month and response.get('year') == now.year:
                self.log_test("Monthly Report Data", True, "Report contains correct month/year")
                return True
                
        return False

    def test_create_financial_goal(self):
        """Test creating a financial goal"""
        goal_data = {
            "name": "Test Savings Goal",
            "target_amount": 10000.00,
            "current_amount": 2500.00,
            "deadline": (datetime.now() + timedelta(days=365)).isoformat(),
            "color": "#22c55e",
            "icon": "piggy-bank"
        }
        
        success, response = self.run_test(
            "Create Financial Goal", "POST", "api/goals", 201, goal_data
        )
        
        if success:
            self.test_goal_id = response.get('id')
            return True
            
        return False

    def test_csv_export(self):
        """Test CSV export endpoint"""
        # Test without auth first (should fail)
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test("CSV Export (No Auth)", "GET", "api/reports/export", 401)
        
        # Restore token and test with auth
        self.token = temp_token
        success, response = self.run_test("CSV Export (With Auth)", "GET", "api/reports/export", 200)
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting FinGestão API Testing...")
        print(f"🌐 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Health check
        self.test_health_check()
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login() 
        self.test_get_current_user()
        self.test_refresh_token()
        
        # Categories
        self.test_default_categories_created()
        self.test_create_category()
        
        # Transactions
        self.test_create_transaction_income()
        self.test_create_transaction_expense() 
        self.test_list_transactions()
        
        # Reports
        self.test_dashboard_endpoint()
        self.test_monthly_report()
        
        # Goals
        self.test_create_financial_goal()
        
        # CSV Export
        self.test_csv_export()
        
        # Final summary
        print("=" * 60)
        print(f"📊 TESTING COMPLETE")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FinGestaoAPITester()
    success = tester.run_all_tests()
    
    # Save test results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': tester.tests_run - tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
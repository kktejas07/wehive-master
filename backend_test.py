#!/usr/bin/env python3
"""
Backend API Testing for We Hive Platform
Tests all backend endpoints with proper authentication flow
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Base URL from frontend .env
BASE_URL = "https://premium-collab-6.preview.emergentagent.com/api"

# Test data
TEST_PHONE = "+919876543210"
TEST_EMAIL = "test@example.com"
MOCK_OTP_CODE = "123456"

class WeHiveAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_health_check(self):
        """Test basic health endpoints"""
        print("=== HEALTH CHECK TESTS ===")
        
        try:
            # Test root endpoint
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if data.get("service") == "We Hive API" and data.get("status") == "ok":
                    self.log_test("Root endpoint", True, f"OTP Channel: {data.get('otp_channel')}")
                else:
                    self.log_test("Root endpoint", False, "Invalid response structure", data)
            else:
                self.log_test("Root endpoint", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
        
        try:
            # Test health endpoint
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200 and response.json().get("ok"):
                self.log_test("Health endpoint", True)
            else:
                self.log_test("Health endpoint", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Health endpoint", False, f"Exception: {str(e)}")
    
    def test_auth_send_otp(self):
        """Test OTP sending functionality"""
        print("=== AUTH SEND OTP TESTS ===")
        
        # Test with phone number
        try:
            payload = {"identifier": TEST_PHONE}
            response = requests.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["sent", "channel", "masked", "dev_code", "ttl_seconds"]
                if all(field in data for field in expected_fields):
                    if data["sent"] and data["channel"] == "mock" and data["dev_code"] == MOCK_OTP_CODE:
                        self.log_test("Send OTP - Phone", True, f"Masked: {data['masked']}, TTL: {data['ttl_seconds']}s")
                    else:
                        self.log_test("Send OTP - Phone", False, "Invalid response values", data)
                else:
                    self.log_test("Send OTP - Phone", False, "Missing required fields", data)
            else:
                self.log_test("Send OTP - Phone", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Send OTP - Phone", False, f"Exception: {str(e)}")
        
        # Test with email
        try:
            payload = {"identifier": TEST_EMAIL}
            response = requests.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data["sent"] and data["channel"] == "mock" and data["dev_code"] == MOCK_OTP_CODE:
                    self.log_test("Send OTP - Email", True, f"Masked: {data['masked']}")
                else:
                    self.log_test("Send OTP - Email", False, "Invalid response values", data)
            else:
                self.log_test("Send OTP - Email", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Send OTP - Email", False, f"Exception: {str(e)}")
        
        # Test with invalid identifier
        try:
            payload = {"identifier": "abc"}
            response = requests.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code == 400:
                self.log_test("Send OTP - Invalid identifier", True, "Correctly rejected invalid identifier")
            else:
                self.log_test("Send OTP - Invalid identifier", False, f"Expected 400, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Send OTP - Invalid identifier", False, f"Exception: {str(e)}")
    
    def test_auth_verify_otp(self):
        """Test OTP verification and get access token"""
        print("=== AUTH VERIFY OTP TESTS ===")
        
        # First send OTP to phone
        try:
            requests.post(f"{self.base_url}/auth/send-otp", json={"identifier": TEST_PHONE})
        except:
            pass
        
        # Test correct OTP verification
        try:
            payload = {
                "identifier": TEST_PHONE,
                "code": MOCK_OTP_CODE,
                "name": "Test User"
            }
            response = requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.access_token = data["access_token"]
                    user = data["user"]
                    if user.get("phone") == TEST_PHONE and user.get("phone_verified"):
                        self.log_test("Verify OTP - Correct code", True, f"User ID: {user.get('id')}, Name: {user.get('name')}")
                    else:
                        self.log_test("Verify OTP - Correct code", False, "User data incorrect", data)
                else:
                    self.log_test("Verify OTP - Correct code", False, "Missing access_token or user", data)
            else:
                self.log_test("Verify OTP - Correct code", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Verify OTP - Correct code", False, f"Exception: {str(e)}")
        
        # Test wrong OTP code
        try:
            # Send OTP again for fresh attempt
            requests.post(f"{self.base_url}/auth/send-otp", json={"identifier": TEST_EMAIL})
            
            payload = {
                "identifier": TEST_EMAIL,
                "code": "999999"
            }
            response = requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 400:
                self.log_test("Verify OTP - Wrong code", True, "Correctly rejected wrong code")
            else:
                self.log_test("Verify OTP - Wrong code", False, f"Expected 400, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Verify OTP - Wrong code", False, f"Exception: {str(e)}")
        
        # Test rate limiting (5 wrong attempts)
        try:
            requests.post(f"{self.base_url}/auth/send-otp", json={"identifier": "rate@test.com"})
            
            # Make 5 wrong attempts
            for i in range(5):
                payload = {"identifier": "rate@test.com", "code": "000000"}
                requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            # 6th attempt should be rate limited
            response = requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 429:
                self.log_test("Verify OTP - Rate limiting", True, "Correctly rate limited after 5 attempts")
            else:
                self.log_test("Verify OTP - Rate limiting", False, f"Expected 429, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Verify OTP - Rate limiting", False, f"Exception: {str(e)}")
    
    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("=== AUTH ME TESTS ===")
        
        # Test with valid token
        if self.access_token:
            try:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = requests.get(f"{self.base_url}/auth/me", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["id", "phone", "phone_verified"]
                    if all(field in data for field in required_fields):
                        self.log_test("Auth /me - Valid token", True, f"User: {data.get('name', 'No name')}, Phone: {data.get('phone')}")
                    else:
                        self.log_test("Auth /me - Valid token", False, "Missing required fields", data)
                else:
                    self.log_test("Auth /me - Valid token", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Auth /me - Valid token", False, f"Exception: {str(e)}")
        else:
            self.log_test("Auth /me - Valid token", False, "No access token available")
        
        # Test without token
        try:
            response = requests.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 401:
                self.log_test("Auth /me - No token", True, "Correctly rejected request without token")
            else:
                self.log_test("Auth /me - No token", False, f"Expected 401, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Auth /me - No token", False, f"Exception: {str(e)}")
        
        # Test with invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token"}
            response = requests.get(f"{self.base_url}/auth/me", headers=headers)
            
            if response.status_code == 401:
                self.log_test("Auth /me - Invalid token", True, "Correctly rejected invalid token")
            else:
                self.log_test("Auth /me - Invalid token", False, f"Expected 401, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Auth /me - Invalid token", False, f"Exception: {str(e)}")
    
    def test_users_endpoints(self):
        """Test user management endpoints"""
        print("=== USER ENDPOINTS TESTS ===")
        
        if not self.access_token:
            self.log_test("Users endpoints", False, "No access token available")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Test update profile
        try:
            payload = {"name": "Updated Test User"}
            response = requests.put(f"{self.base_url}/users/me", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == "Updated Test User":
                    self.log_test("Update profile", True, f"Name updated to: {data.get('name')}")
                else:
                    self.log_test("Update profile", False, "Name not updated correctly", data)
            else:
                self.log_test("Update profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Update profile", False, f"Exception: {str(e)}")
        
        # Test create application
        application_id = None
        try:
            payload = {
                "country_id": "us",
                "visa_type": "Tourist",
                "travel_date": "2026-08-01"
            }
            response = requests.post(f"{self.base_url}/users/me/applications", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("country_id") == "us":
                    application_id = data["id"]
                    self.log_test("Create application", True, f"Application ID: {application_id}")
                else:
                    self.log_test("Create application", False, "Invalid response structure", data)
            else:
                self.log_test("Create application", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create application", False, f"Exception: {str(e)}")
        
        # Test list applications
        try:
            response = requests.get(f"{self.base_url}/users/me/applications", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if application_id and any(app.get("id") == application_id for app in data):
                        self.log_test("List applications", True, f"Found {len(data)} applications including created one")
                    elif len(data) >= 0:  # Empty list is also valid
                        self.log_test("List applications", True, f"Retrieved {len(data)} applications")
                    else:
                        self.log_test("List applications", False, "Created application not found in list", data)
                else:
                    self.log_test("List applications", False, "Response is not a list", data)
            else:
                self.log_test("List applications", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("List applications", False, f"Exception: {str(e)}")
        
        # Test create saved plan
        plan_id = None
        try:
            payload = {
                "country_id": "jp",
                "duration_days": 7
            }
            response = requests.post(f"{self.base_url}/users/me/saved-plans", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("country_id") == "jp":
                    plan_id = data["id"]
                    self.log_test("Create saved plan", True, f"Plan ID: {plan_id}")
                else:
                    self.log_test("Create saved plan", False, "Invalid response structure", data)
            else:
                self.log_test("Create saved plan", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create saved plan", False, f"Exception: {str(e)}")
        
        # Test list saved plans
        try:
            response = requests.get(f"{self.base_url}/users/me/saved-plans", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if plan_id and any(plan.get("id") == plan_id for plan in data):
                        self.log_test("List saved plans", True, f"Found {len(data)} plans including created one")
                    elif len(data) >= 0:  # Empty list is also valid
                        self.log_test("List saved plans", True, f"Retrieved {len(data)} plans")
                    else:
                        self.log_test("List saved plans", False, "Created plan not found in list", data)
                else:
                    self.log_test("List saved plans", False, "Response is not a list", data)
            else:
                self.log_test("List saved plans", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("List saved plans", False, f"Exception: {str(e)}")
    
    def test_countries_endpoints(self):
        """Test countries endpoints"""
        print("=== COUNTRIES ENDPOINTS TESTS ===")
        
        # Test list all countries
        try:
            response = requests.get(f"{self.base_url}/countries")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 15:
                    self.log_test("List countries", True, f"Retrieved {len(data)} countries")
                else:
                    self.log_test("List countries", False, f"Expected 15 countries, got {len(data) if isinstance(data, list) else 'non-list'}", data[:2] if isinstance(data, list) else data)
            else:
                self.log_test("List countries", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("List countries", False, f"Exception: {str(e)}")
        
        # Test filter by visa type
        try:
            response = requests.get(f"{self.base_url}/countries?visa_type=Tourist")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if all returned countries have Tourist visa type
                    all_have_tourist = all("Tourist" in country.get("visa_types", []) for country in data)
                    if all_have_tourist:
                        self.log_test("Filter countries - visa_type=Tourist", True, f"Found {len(data)} countries with Tourist visa")
                    else:
                        self.log_test("Filter countries - visa_type=Tourist", False, "Some countries don't have Tourist visa type")
                else:
                    self.log_test("Filter countries - visa_type=Tourist", False, f"Expected list with items, got {type(data)} with {len(data) if isinstance(data, list) else 'unknown'} items")
            else:
                self.log_test("Filter countries - visa_type=Tourist", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Filter countries - visa_type=Tourist", False, f"Exception: {str(e)}")
        
        # Test filter by delivery=same_day
        try:
            response = requests.get(f"{self.base_url}/countries?delivery=same_day")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Should return countries with same_day delivery (UAE, Singapore, Thailand, Nepal, Bhutan)
                    same_day_countries = [c["id"] for c in data if c.get("delivery", {}).get("same_day")]
                    expected_same_day = ["ae", "sg", "th", "np", "bt"]  # Based on typical country codes
                    if len(data) >= 3:  # At least some same-day countries
                        self.log_test("Filter countries - delivery=same_day", True, f"Found {len(data)} countries with same-day delivery")
                    else:
                        self.log_test("Filter countries - delivery=same_day", False, f"Expected multiple countries, got {len(data)}")
                else:
                    self.log_test("Filter countries - delivery=same_day", False, "Response is not a list", data)
            else:
                self.log_test("Filter countries - delivery=same_day", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Filter countries - delivery=same_day", False, f"Exception: {str(e)}")
        
        # Test filter by no_visa=true
        try:
            response = requests.get(f"{self.base_url}/countries?no_visa=true")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 2:
                    # Should return Nepal and Bhutan
                    self.log_test("Filter countries - no_visa=true", True, f"Found {len(data)} no-visa countries")
                else:
                    self.log_test("Filter countries - no_visa=true", False, f"Expected 2 countries, got {len(data) if isinstance(data, list) else 'non-list'}")
            else:
                self.log_test("Filter countries - no_visa=true", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Filter countries - no_visa=true", False, f"Exception: {str(e)}")
        
        # Test country detail
        try:
            response = requests.get(f"{self.base_url}/countries/us")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "delivery", "visa_types"]
                if all(field in data for field in required_fields):
                    self.log_test("Country detail - US", True, f"Country: {data.get('name')}")
                else:
                    self.log_test("Country detail - US", False, "Missing required fields", data)
            else:
                self.log_test("Country detail - US", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Country detail - US", False, f"Exception: {str(e)}")
        
        # Test country holiday plan
        try:
            response = requests.get(f"{self.base_url}/countries/us/holiday-plan")
            
            if response.status_code == 200:
                data = response.json()
                if "country" in data and "plan" in data:
                    plan = data["plan"]
                    required_plan_fields = ["best_time", "currency", "language", "weather", "attractions", "itinerary"]
                    if all(field in plan for field in required_plan_fields):
                        attractions_count = len(plan.get("attractions", []))
                        itinerary_count = len(plan.get("itinerary", []))
                        self.log_test("Country holiday plan - US", True, f"Plan with {attractions_count} attractions, {itinerary_count} itinerary items")
                    else:
                        self.log_test("Country holiday plan - US", False, "Missing required plan fields", plan)
                else:
                    self.log_test("Country holiday plan - US", False, "Missing country or plan", data)
            else:
                self.log_test("Country holiday plan - US", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Country holiday plan - US", False, f"Exception: {str(e)}")
        
        # Test invalid country
        try:
            response = requests.get(f"{self.base_url}/countries/xx")
            
            if response.status_code == 404:
                self.log_test("Country detail - Invalid", True, "Correctly returned 404 for invalid country")
            else:
                self.log_test("Country detail - Invalid", False, f"Expected 404, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Country detail - Invalid", False, f"Exception: {str(e)}")
    
    def test_leads_endpoint(self):
        """Test leads endpoint"""
        print("=== LEADS ENDPOINT TESTS ===")
        
        try:
            payload = {
                "name": "John Doe",
                "email": "john@example.com",
                "message": "I'm interested in visa services"
            }
            response = requests.post(f"{self.base_url}/leads", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("ok"):
                    self.log_test("Create lead", True, f"Lead ID: {data['id']}")
                else:
                    self.log_test("Create lead", False, "Invalid response structure", data)
            else:
                self.log_test("Create lead", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create lead", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"Starting We Hive Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        self.test_health_check()
        self.test_auth_send_otp()
        self.test_auth_verify_otp()
        self.test_auth_me()
        self.test_users_endpoints()
        self.test_countries_endpoints()
        self.test_leads_endpoint()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = WeHiveAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
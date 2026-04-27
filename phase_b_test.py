#!/usr/bin/env python3
"""
Phase B Backend API Testing for We Hive Platform
Tests new Phase B endpoints: applications with documents, timeline, messages, PDF receipts
"""

import requests
import json
import sys
import io
import random
import string
from datetime import datetime

# Base URL from frontend .env
BASE_URL = "https://premium-collab-6.preview.emergentagent.com/api"
MOCK_OTP_CODE = "123456"

class PhaseBAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.access_token_2 = None  # For cross-user testing
        self.app_id = None
        self.doc_id = None
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
    
    def setup_auth(self):
        """Setup authentication for testing"""
        print("=== SETUP AUTHENTICATION ===")
        
        # Generate random email for fresh testing
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"phaseb-tester+{random_suffix}@example.com"
        
        try:
            # Send OTP
            payload = {"identifier": test_email}
            response = requests.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code != 200:
                self.log_test("Setup - Send OTP", False, f"Status: {response.status_code}", response.text)
                return False
            
            # Verify OTP
            payload = {
                "identifier": test_email,
                "code": MOCK_OTP_CODE,
                "name": "Phase B Tester"
            }
            response = requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.access_token = data["access_token"]
                    self.log_test("Setup - Authentication", True, f"Email: {test_email}")
                    return True
                else:
                    self.log_test("Setup - Authentication", False, "No access token", data)
                    return False
            else:
                self.log_test("Setup - Authentication", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Setup - Authentication", False, f"Exception: {str(e)}")
            return False
    
    def setup_second_user(self):
        """Setup second user for cross-user testing"""
        print("=== SETUP SECOND USER ===")
        
        # Generate random email for second user
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email_2 = f"phaseb-tester2+{random_suffix}@example.com"
        
        try:
            # Send OTP
            payload = {"identifier": test_email_2}
            response = requests.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code != 200:
                self.log_test("Setup - Second user OTP", False, f"Status: {response.status_code}", response.text)
                return False
            
            # Verify OTP
            payload = {
                "identifier": test_email_2,
                "code": MOCK_OTP_CODE,
                "name": "Phase B Tester 2"
            }
            response = requests.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.access_token_2 = data["access_token"]
                    self.log_test("Setup - Second user auth", True, f"Email: {test_email_2}")
                    return True
                else:
                    self.log_test("Setup - Second user auth", False, "No access token", data)
                    return False
            else:
                self.log_test("Setup - Second user auth", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Setup - Second user auth", False, f"Exception: {str(e)}")
            return False
    
    def create_application(self):
        """Create test application"""
        print("=== CREATE APPLICATION ===")
        
        if not self.access_token:
            self.log_test("Create application", False, "No access token")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            payload = {
                "country_id": "us",
                "visa_type": "Tourist"
            }
            response = requests.post(f"{self.base_url}/users/me/applications", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.app_id = data["id"]
                    self.log_test("Create application", True, f"Application ID: {self.app_id}")
                    return True
                else:
                    self.log_test("Create application", False, "No ID in response", data)
                    return False
            else:
                self.log_test("Create application", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Create application", False, f"Exception: {str(e)}")
            return False
    
    def test_application_detail(self):
        """Test A: GET /api/users/me/applications/{APP_ID}"""
        print("=== TEST A: APPLICATION DETAIL ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("A. Application detail", False, "Missing auth or app_id")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["id", "timeline", "documents", "messages"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("A. Application detail", False, f"Missing fields: {missing_fields}", data)
                    return
                
                # Check timeline has 1 event with status='draft'
                timeline = data.get("timeline", [])
                if len(timeline) == 1 and timeline[0].get("status") == "draft":
                    timeline_ok = True
                else:
                    timeline_ok = False
                
                # Check documents is empty array
                documents = data.get("documents", [])
                docs_ok = isinstance(documents, list) and len(documents) == 0
                
                # Check messages is empty array
                messages = data.get("messages", [])
                msgs_ok = isinstance(messages, list) and len(messages) == 0
                
                if timeline_ok and docs_ok and msgs_ok:
                    self.log_test("A. Application detail", True, f"Timeline: {len(timeline)} events, Documents: {len(documents)}, Messages: {len(messages)}")
                else:
                    self.log_test("A. Application detail", False, f"Timeline OK: {timeline_ok}, Docs OK: {docs_ok}, Msgs OK: {msgs_ok}", data)
            else:
                self.log_test("A. Application detail", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("A. Application detail", False, f"Exception: {str(e)}")
    
    def test_document_upload(self):
        """Test B: Document upload with various scenarios"""
        print("=== TEST B: DOCUMENT UPLOAD ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("B. Document upload", False, "Missing auth or app_id")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # B1: Upload small valid file
        try:
            # Create a small fake image file
            fake_image_content = b"fake_image_data_" + b"x" * 1000  # ~1KB
            files = {
                'file': ('fake.jpg', io.BytesIO(fake_image_content), 'image/jpeg')
            }
            data = {
                'doc_type': 'Passport (6mo validity)'
            }
            
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/documents", 
                                   files=files, data=data, headers=headers)
            
            if response.status_code == 200:
                resp_data = response.json()
                required_fields = ["id", "status", "filename", "size"]
                missing_fields = [field for field in required_fields if field not in resp_data]
                
                if not missing_fields and resp_data.get("status") == "uploaded":
                    self.doc_id = resp_data["id"]
                    self.log_test("B1. Upload small file", True, f"Doc ID: {self.doc_id}, Size: {resp_data.get('size')} bytes")
                else:
                    self.log_test("B1. Upload small file", False, f"Missing fields: {missing_fields} or wrong status", resp_data)
            else:
                self.log_test("B1. Upload small file", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("B1. Upload small file", False, f"Exception: {str(e)}")
        
        # B2: Upload large file (>12MB) - should get 413
        try:
            # Create a large file (~12MB)
            large_content = b"x" * (12 * 1024 * 1024 + 1000)  # 12MB + 1KB
            files = {
                'file': ('large.jpg', io.BytesIO(large_content), 'image/jpeg')
            }
            data = {
                'doc_type': 'Passport (6mo validity)'
            }
            
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/documents", 
                                   files=files, data=data, headers=headers)
            
            if response.status_code == 413:
                self.log_test("B2. Upload large file (>12MB)", True, "Correctly rejected large file with 413")
            else:
                self.log_test("B2. Upload large file (>12MB)", False, f"Expected 413, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("B2. Upload large file (>12MB)", False, f"Exception: {str(e)}")
        
        # B3: Upload text file - should get 415
        try:
            text_content = b"This is a text file content"
            files = {
                'file': ('document.txt', io.BytesIO(text_content), 'text/plain')
            }
            data = {
                'doc_type': 'Passport (6mo validity)'
            }
            
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/documents", 
                                   files=files, data=data, headers=headers)
            
            if response.status_code == 415:
                self.log_test("B3. Upload text file", True, "Correctly rejected text file with 415")
            else:
                self.log_test("B3. Upload text file", False, f"Expected 415, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("B3. Upload text file", False, f"Exception: {str(e)}")
    
    def test_list_documents(self):
        """Test C: GET /api/users/me/applications/{APP_ID}/documents"""
        print("=== TEST C: LIST DOCUMENTS ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("C. List documents", False, "Missing auth or app_id")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}/documents", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if self.doc_id and any(doc.get("id") == self.doc_id for doc in data):
                        self.log_test("C. List documents", True, f"Found {len(data)} documents including uploaded one")
                    elif len(data) == 0:
                        self.log_test("C. List documents", True, "No documents found (expected if upload failed)")
                    else:
                        self.log_test("C. List documents", False, f"Uploaded doc {self.doc_id} not found in list", data)
                else:
                    self.log_test("C. List documents", False, "Response is not a list", data)
            else:
                self.log_test("C. List documents", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("C. List documents", False, f"Exception: {str(e)}")
    
    def test_download_document(self):
        """Test D: GET /api/users/me/applications/{APP_ID}/documents/{DOC_ID}/download"""
        print("=== TEST D: DOWNLOAD DOCUMENT ===")
        
        if not self.access_token or not self.app_id or not self.doc_id:
            self.log_test("D. Download document", False, "Missing auth, app_id, or doc_id")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}/documents/{self.doc_id}/download", headers=headers)
            
            if response.status_code == 200:
                # Check if content matches what was uploaded
                content = response.content
                if len(content) > 1000:  # Should be around 1KB + prefix
                    self.log_test("D. Download document", True, f"Downloaded {len(content)} bytes")
                else:
                    self.log_test("D. Download document", False, f"Content size mismatch: {len(content)} bytes")
            else:
                self.log_test("D. Download document", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("D. Download document", False, f"Exception: {str(e)}")
    
    def test_delete_document(self):
        """Test E: DELETE /api/users/me/applications/{APP_ID}/documents/{DOC_ID}"""
        print("=== TEST E: DELETE DOCUMENT ===")
        
        if not self.access_token or not self.app_id or not self.doc_id:
            self.log_test("E. Delete document", False, "Missing auth, app_id, or doc_id")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.delete(f"{self.base_url}/users/me/applications/{self.app_id}/documents/{self.doc_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    self.log_test("E. Delete document", True, "Document deleted successfully")
                    
                    # Verify it's gone by listing documents
                    list_response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}/documents", headers=headers)
                    if list_response.status_code == 200:
                        docs = list_response.json()
                        if not any(doc.get("id") == self.doc_id for doc in docs):
                            self.log_test("E. Verify deletion", True, "Document no longer in list")
                        else:
                            self.log_test("E. Verify deletion", False, "Document still in list after deletion")
                    else:
                        self.log_test("E. Verify deletion", False, f"Could not verify deletion: {list_response.status_code}")
                else:
                    self.log_test("E. Delete document", False, "Response missing 'ok' field", data)
            else:
                self.log_test("E. Delete document", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("E. Delete document", False, f"Exception: {str(e)}")
    
    def test_submit_flow(self):
        """Test F: Submit application flow"""
        print("=== TEST F: SUBMIT FLOW ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("F. Submit flow", False, "Missing auth or app_id")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # F1: Try to submit with no documents - should get 400
        try:
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/submit", headers=headers)
            
            if response.status_code == 400:
                resp_text = response.text
                if "Upload at least one document" in resp_text:
                    self.log_test("F1. Submit without docs", True, "Correctly rejected submission without documents")
                else:
                    self.log_test("F1. Submit without docs", False, f"Wrong error message: {resp_text}")
            else:
                self.log_test("F1. Submit without docs", False, f"Expected 400, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("F1. Submit without docs", False, f"Exception: {str(e)}")
        
        # F2: Upload a document first
        try:
            fake_image_content = b"fake_image_data_" + b"x" * 1000  # ~1KB
            files = {
                'file': ('passport.jpg', io.BytesIO(fake_image_content), 'image/jpeg')
            }
            data = {
                'doc_type': 'Passport (6mo validity)'
            }
            
            upload_response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/documents", 
                                          files=files, data=data, headers=headers)
            
            if upload_response.status_code == 200:
                self.log_test("F2. Re-upload document", True, "Document uploaded for submission test")
            else:
                self.log_test("F2. Re-upload document", False, f"Upload failed: {upload_response.status_code}")
                return
        except Exception as e:
            self.log_test("F2. Re-upload document", False, f"Exception: {str(e)}")
            return
        
        # F3: Submit with document - should succeed
        try:
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/submit", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") and data.get("status") == "in_review":
                    self.log_test("F3. Submit with docs", True, f"Status: {data.get('status')}")
                    
                    # F4: Verify timeline has ≥3 events
                    app_response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}", headers=headers)
                    if app_response.status_code == 200:
                        app_data = app_response.json()
                        timeline = app_data.get("timeline", [])
                        if len(timeline) >= 3:
                            statuses = [event.get("status") for event in timeline]
                            self.log_test("F4. Verify timeline", True, f"Timeline has {len(timeline)} events: {statuses}")
                        else:
                            self.log_test("F4. Verify timeline", False, f"Timeline has only {len(timeline)} events, expected ≥3")
                    else:
                        self.log_test("F4. Verify timeline", False, f"Could not fetch app: {app_response.status_code}")
                else:
                    self.log_test("F3. Submit with docs", False, "Invalid response structure", data)
            else:
                self.log_test("F3. Submit with docs", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("F3. Submit with docs", False, f"Exception: {str(e)}")
    
    def test_messages(self):
        """Test G: Messages system"""
        print("=== TEST G: MESSAGES ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("G. Messages", False, "Missing auth or app_id")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # G1: Post a message
        try:
            payload = {"text": "Hello, when is my interview?"}
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/messages", 
                                   json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 2:
                    # Should return user message + consultant auto-reply
                    user_msg = data[0]
                    consultant_msg = data[1]
                    
                    if (user_msg.get("from") == "user" and user_msg.get("text") == "Hello, when is my interview?" and
                        consultant_msg.get("from") == "consultant" and "Kiran" in consultant_msg.get("name", "")):
                        self.log_test("G1. Post message", True, f"User msg + consultant auto-reply received")
                    else:
                        self.log_test("G1. Post message", False, "Invalid message structure", data)
                else:
                    self.log_test("G1. Post message", False, f"Expected 2-element array, got {type(data)} with {len(data) if isinstance(data, list) else 'unknown'} elements")
            else:
                self.log_test("G1. Post message", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("G1. Post message", False, f"Exception: {str(e)}")
        
        # G2: Try to post empty message - should get 400
        try:
            payload = {"text": ""}
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/messages", 
                                   json=payload, headers=headers)
            
            if response.status_code == 400:
                self.log_test("G2. Empty message", True, "Correctly rejected empty message")
            else:
                self.log_test("G2. Empty message", False, f"Expected 400, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("G2. Empty message", False, f"Exception: {str(e)}")
        
        # G3: Get messages list
        try:
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}/messages", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:
                    # Should have at least the user message + consultant reply
                    self.log_test("G3. List messages", True, f"Retrieved {len(data)} messages")
                else:
                    self.log_test("G3. List messages", False, f"Expected list with ≥2 messages, got {type(data)} with {len(data) if isinstance(data, list) else 'unknown'} messages")
            else:
                self.log_test("G3. List messages", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("G3. List messages", False, f"Exception: {str(e)}")
    
    def test_receipt_pdf(self):
        """Test H: Receipt PDF generation"""
        print("=== TEST H: RECEIPT PDF ===")
        
        if not self.access_token or not self.app_id:
            self.log_test("H. Receipt PDF", False, "Missing auth or app_id")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}/receipt.pdf", headers=headers)
            
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                content = response.content
                
                # Check content type
                if content_type == "application/pdf":
                    # Check if content starts with PDF signature
                    if content.startswith(b"%PDF"):
                        self.log_test("H. Receipt PDF", True, f"PDF generated successfully, size: {len(content)} bytes")
                    else:
                        self.log_test("H. Receipt PDF", False, f"Content doesn't start with %PDF: {content[:10]}")
                else:
                    self.log_test("H. Receipt PDF", False, f"Wrong content-type: {content_type}")
            else:
                self.log_test("H. Receipt PDF", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("H. Receipt PDF", False, f"Exception: {str(e)}")
    
    def test_cross_user_authorization(self):
        """Test I: Cross-user authorization"""
        print("=== TEST I: CROSS-USER AUTHORIZATION ===")
        
        if not self.access_token_2 or not self.app_id:
            self.log_test("I. Cross-user auth", False, "Missing second user token or app_id")
            return
        
        headers_2 = {"Authorization": f"Bearer {self.access_token_2}"}
        
        # I1: Try to access first user's application with second user's token
        try:
            response = requests.get(f"{self.base_url}/users/me/applications/{self.app_id}", headers=headers_2)
            
            if response.status_code == 404:
                self.log_test("I1. Cross-user app access", True, "Correctly denied access to other user's application")
            else:
                self.log_test("I1. Cross-user app access", False, f"Expected 404, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("I1. Cross-user app access", False, f"Exception: {str(e)}")
        
        # I2: Try to upload document to first user's application with second user's token
        try:
            fake_image_content = b"fake_image_data_" + b"x" * 1000
            files = {
                'file': ('unauthorized.jpg', io.BytesIO(fake_image_content), 'image/jpeg')
            }
            data = {
                'doc_type': 'Passport (6mo validity)'
            }
            
            response = requests.post(f"{self.base_url}/users/me/applications/{self.app_id}/documents", 
                                   files=files, data=data, headers=headers_2)
            
            if response.status_code == 404:
                self.log_test("I2. Cross-user doc upload", True, "Correctly denied document upload to other user's application")
            else:
                self.log_test("I2. Cross-user doc upload", False, f"Expected 404, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("I2. Cross-user doc upload", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all Phase B tests in sequence"""
        print(f"Starting We Hive Phase B Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_auth():
            print("❌ Authentication setup failed, aborting tests")
            return False
        
        if not self.create_application():
            print("❌ Application creation failed, aborting tests")
            return False
        
        if not self.setup_second_user():
            print("❌ Second user setup failed, skipping cross-user tests")
        
        # Run tests
        self.test_application_detail()
        self.test_document_upload()
        self.test_list_documents()
        self.test_download_document()
        self.test_delete_document()
        self.test_submit_flow()
        self.test_messages()
        self.test_receipt_pdf()
        self.test_cross_user_authorization()
        
        # Summary
        print("=" * 60)
        print("PHASE B TEST SUMMARY")
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
    tester = PhaseBAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
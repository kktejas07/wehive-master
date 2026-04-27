#!/usr/bin/env python3
"""
Phase B Backend API Testing - Phone-based version
"""

import requests
import json
import sys
import io
import random

BASE_URL = "https://premium-collab-6.preview.emergentagent.com/api"
MOCK_OTP_CODE = "123456"

def test_phase_b_with_phone():
    print("=== PHASE B TESTING WITH PHONE NUMBERS ===")
    
    # Use phone numbers to avoid email duplicate key issues
    phone1 = f"+91987654{random.randint(1000, 9999)}"
    phone2 = f"+91987654{random.randint(1000, 9999)}"
    
    # Setup User 1
    print(f"Setting up User 1 with phone: {phone1}")
    requests.post(f"{BASE_URL}/auth/send-otp", json={"identifier": phone1})
    response1 = requests.post(f"{BASE_URL}/auth/verify-otp", json={
        "identifier": phone1,
        "code": MOCK_OTP_CODE,
        "name": "Phase B Tester 1"
    })
    
    if response1.status_code != 200:
        print(f"❌ User 1 auth failed: {response1.status_code}")
        return False
    
    token1 = response1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    print("✅ User 1 authenticated")
    
    # Create application
    app_response = requests.post(f"{BASE_URL}/users/me/applications", 
                                json={"country_id": "us", "visa_type": "Tourist"}, 
                                headers=headers1)
    
    if app_response.status_code != 200:
        print(f"❌ App creation failed: {app_response.status_code}")
        return False
    
    app_id = app_response.json()["id"]
    print(f"✅ Application created: {app_id}")
    
    # Test A: Application detail
    detail_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}", headers=headers1)
    if detail_response.status_code == 200:
        data = detail_response.json()
        timeline = data.get("timeline", [])
        documents = data.get("documents", [])
        messages = data.get("messages", [])
        if len(timeline) == 1 and timeline[0].get("status") == "draft" and len(documents) == 0 and len(messages) == 0:
            print("✅ A. Application detail - correct structure")
        else:
            print(f"❌ A. Application detail - wrong structure: timeline={len(timeline)}, docs={len(documents)}, msgs={len(messages)}")
    else:
        print(f"❌ A. Application detail failed: {detail_response.status_code}")
    
    # Test B: Document upload
    fake_content = b"fake_image_data_" + b"x" * 1000
    files = {'file': ('test.jpg', io.BytesIO(fake_content), 'image/jpeg')}
    data = {'doc_type': 'Passport (6mo validity)'}
    
    upload_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/documents", 
                                   files=files, data=data, headers=headers1)
    
    if upload_response.status_code == 200:
        doc_data = upload_response.json()
        doc_id = doc_data.get("id")
        print(f"✅ B. Document upload successful: {doc_id}")
        
        # Test large file (should fail with 413)
        large_content = b"x" * (12 * 1024 * 1024 + 1000)
        large_files = {'file': ('large.jpg', io.BytesIO(large_content), 'image/jpeg')}
        large_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/documents", 
                                      files=large_files, data=data, headers=headers1)
        if large_response.status_code == 413:
            print("✅ B. Large file correctly rejected (413)")
        else:
            print(f"❌ B. Large file not rejected: {large_response.status_code}")
        
        # Test text file (should fail with 415)
        text_files = {'file': ('test.txt', io.BytesIO(b"text content"), 'text/plain')}
        text_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/documents", 
                                     files=text_files, data=data, headers=headers1)
        if text_response.status_code == 415:
            print("✅ B. Text file correctly rejected (415)")
        else:
            print(f"❌ B. Text file not rejected: {text_response.status_code}")
    else:
        print(f"❌ B. Document upload failed: {upload_response.status_code}")
        doc_id = None
    
    # Test C: List documents
    list_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}/documents", headers=headers1)
    if list_response.status_code == 200:
        docs = list_response.json()
        if doc_id and any(d.get("id") == doc_id for d in docs):
            print(f"✅ C. List documents - found uploaded doc")
        else:
            print(f"❌ C. List documents - uploaded doc not found")
    else:
        print(f"❌ C. List documents failed: {list_response.status_code}")
    
    # Test D: Download document
    if doc_id:
        download_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}/documents/{doc_id}/download", headers=headers1)
        if download_response.status_code == 200 and len(download_response.content) > 1000:
            print("✅ D. Download document successful")
        else:
            print(f"❌ D. Download document failed: {download_response.status_code}")
    
    # Test F: Submit flow
    # First try without docs (should fail)
    submit_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/submit", headers=headers1)
    if submit_response.status_code == 400 and "Upload at least one document" in submit_response.text:
        print("✅ F. Submit without docs correctly rejected")
        
        # Upload a doc and try again
        files = {'file': ('passport.jpg', io.BytesIO(fake_content), 'image/jpeg')}
        requests.post(f"{BASE_URL}/users/me/applications/{app_id}/documents", 
                     files=files, data=data, headers=headers1)
        
        submit_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/submit", headers=headers1)
        if submit_response.status_code == 200:
            submit_data = submit_response.json()
            if submit_data.get("ok") and submit_data.get("status") == "in_review":
                print("✅ F. Submit with docs successful")
                
                # Check timeline
                detail_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}", headers=headers1)
                if detail_response.status_code == 200:
                    timeline = detail_response.json().get("timeline", [])
                    if len(timeline) >= 3:
                        print(f"✅ F. Timeline updated correctly ({len(timeline)} events)")
                    else:
                        print(f"❌ F. Timeline not updated correctly ({len(timeline)} events)")
            else:
                print(f"❌ F. Submit response incorrect: {submit_data}")
        else:
            print(f"❌ F. Submit with docs failed: {submit_response.status_code}")
    else:
        print(f"❌ F. Submit without docs not properly rejected: {submit_response.status_code}")
    
    # Test G: Messages
    msg_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/messages", 
                                json={"text": "Hello, when is my interview?"}, headers=headers1)
    if msg_response.status_code == 200:
        msgs = msg_response.json()
        if len(msgs) == 2 and msgs[0].get("from") == "user" and msgs[1].get("from") == "consultant":
            print("✅ G. Messages - user msg + consultant reply")
        else:
            print(f"❌ G. Messages - wrong structure: {len(msgs)} messages")
    else:
        print(f"❌ G. Messages failed: {msg_response.status_code}")
    
    # Test empty message
    empty_msg_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/messages", 
                                      json={"text": ""}, headers=headers1)
    if empty_msg_response.status_code == 400:
        print("✅ G. Empty message correctly rejected")
    else:
        print(f"❌ G. Empty message not rejected: {empty_msg_response.status_code}")
    
    # Test H: Receipt PDF
    pdf_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}/receipt.pdf", headers=headers1)
    if pdf_response.status_code == 200:
        content_type = pdf_response.headers.get("content-type", "")
        content = pdf_response.content
        if content_type == "application/pdf" and content.startswith(b"%PDF"):
            print(f"✅ H. Receipt PDF generated ({len(content)} bytes)")
        else:
            print(f"❌ H. Receipt PDF wrong format: {content_type}")
    else:
        print(f"❌ H. Receipt PDF failed: {pdf_response.status_code}")
    
    # Test I: Cross-user authorization
    print(f"Setting up User 2 with phone: {phone2}")
    requests.post(f"{BASE_URL}/auth/send-otp", json={"identifier": phone2})
    response2 = requests.post(f"{BASE_URL}/auth/verify-otp", json={
        "identifier": phone2,
        "code": MOCK_OTP_CODE,
        "name": "Phase B Tester 2"
    })
    
    if response2.status_code == 200:
        token2 = response2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Try to access User 1's application
        cross_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}", headers=headers2)
        if cross_response.status_code == 404:
            print("✅ I. Cross-user access correctly denied")
        else:
            print(f"❌ I. Cross-user access not denied: {cross_response.status_code}")
    else:
        print(f"❌ I. User 2 auth failed: {response2.status_code}")
    
    print("\n=== PHASE B TESTING COMPLETE ===")
    return True

if __name__ == "__main__":
    test_phase_b_with_phone()
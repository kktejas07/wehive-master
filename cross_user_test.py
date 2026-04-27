#!/usr/bin/env python3
"""
Simple cross-user test for Phase B endpoints
"""

import requests
import json
import io
import random
import string

BASE_URL = "https://premium-collab-6.preview.emergentagent.com/api"
MOCK_OTP_CODE = "123456"

def test_cross_user():
    print("=== CROSS-USER AUTHORIZATION TEST ===")
    
    # Create first user and application
    random_suffix1 = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    email1 = f"crosstest1+{random_suffix1}@example.com"
    
    # Send OTP for user 1
    requests.post(f"{BASE_URL}/auth/send-otp", json={"identifier": email1})
    
    # Verify OTP for user 1
    response1 = requests.post(f"{BASE_URL}/auth/verify-otp", json={
        "identifier": email1,
        "code": MOCK_OTP_CODE,
        "name": "Cross Test User 1"
    })
    
    if response1.status_code != 200:
        print(f"❌ User 1 auth failed: {response1.status_code}")
        return
    
    token1 = response1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    
    # Create application for user 1
    app_response = requests.post(f"{BASE_URL}/users/me/applications", 
                                json={"country_id": "us", "visa_type": "Tourist"}, 
                                headers=headers1)
    
    if app_response.status_code != 200:
        print(f"❌ App creation failed: {app_response.status_code}")
        return
    
    app_id = app_response.json()["id"]
    print(f"✅ User 1 created application: {app_id}")
    
    # Try to create second user with different email
    random_suffix2 = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    email2 = f"crosstest2+{random_suffix2}@example.com"
    
    # Send OTP for user 2
    requests.post(f"{BASE_URL}/auth/send-otp", json={"identifier": email2})
    
    # Verify OTP for user 2
    response2 = requests.post(f"{BASE_URL}/auth/verify-otp", json={
        "identifier": email2,
        "code": MOCK_OTP_CODE,
        "name": "Cross Test User 2"
    })
    
    if response2.status_code != 200:
        print(f"❌ User 2 auth failed: {response2.status_code} - {response2.text}")
        # Try with phone number instead
        phone2 = f"+91987654{random.randint(1000, 9999)}"
        requests.post(f"{BASE_URL}/auth/send-otp", json={"identifier": phone2})
        response2 = requests.post(f"{BASE_URL}/auth/verify-otp", json={
            "identifier": phone2,
            "code": MOCK_OTP_CODE,
            "name": "Cross Test User 2"
        })
        if response2.status_code != 200:
            print(f"❌ User 2 phone auth also failed: {response2.status_code}")
            return
    
    token2 = response2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    print(f"✅ User 2 authenticated")
    
    # Test cross-user access
    # User 2 tries to access User 1's application
    cross_response = requests.get(f"{BASE_URL}/users/me/applications/{app_id}", headers=headers2)
    
    if cross_response.status_code == 404:
        print("✅ Cross-user application access correctly denied (404)")
    else:
        print(f"❌ Cross-user access not properly blocked: {cross_response.status_code}")
    
    # User 2 tries to upload document to User 1's application
    fake_content = b"fake_image_data_" + b"x" * 1000
    files = {'file': ('unauthorized.jpg', io.BytesIO(fake_content), 'image/jpeg')}
    data = {'doc_type': 'Passport (6mo validity)'}
    
    upload_response = requests.post(f"{BASE_URL}/users/me/applications/{app_id}/documents", 
                                   files=files, data=data, headers=headers2)
    
    if upload_response.status_code == 404:
        print("✅ Cross-user document upload correctly denied (404)")
    else:
        print(f"❌ Cross-user document upload not properly blocked: {upload_response.status_code}")

if __name__ == "__main__":
    test_cross_user()
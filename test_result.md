#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build a Wehive (wehive.co.in) visa platform inspired by atlys.com with:
  - Atlys-style search/filter bar (Visa delivery, Type, Documents, Holidays date picker, Explore/Events tabs)
  - Country grid with detail pages, holiday planner per country
  - User auth with mobile (WhatsApp/SMS OTP) AND email OTP
  - Hybrid OTP: mock now, real Twilio + SMTP via env switch
  - Save applications + holiday plans per user

backend:
  - task: "Auth: send-otp + verify-otp (mock channel)"
    implemented: true
    working: true
    file: "/app/backend/routes_auth.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/auth/send-otp with email or phone returns dev_code in mock mode. POST /api/auth/verify-otp accepts code, creates/updates user, returns JWT + user. Test both email and phone identifiers, verify dev_code is present in mock mode, verify JWT decoding works on /api/auth/me."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: All auth flows working perfectly. send-otp works with phone (+919876543210) and email (test@example.com), returns sent=true, channel='mock', dev_code='123456', proper masking. verify-otp accepts correct code, creates user, returns JWT + user object. Rate limiting works after 5 wrong attempts (429). Invalid identifiers properly rejected (400)."

  - task: "Auth: GET /me with Bearer token"
    implemented: true
    working: true
    file: "/app/backend/routes_auth.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Returns current user from JWT. Should 401 without/with bad token."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: /auth/me endpoint working correctly. Returns user data with valid Bearer token. Properly rejects requests without token (401) and with invalid tokens (401). JWT validation working as expected."

  - task: "Users: PUT /me, applications CRUD, saved plans CRUD"
    implemented: true
    working: true
    file: "/app/backend/routes_users.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Authenticated endpoints. Test create+list applications, create+list saved plans. Should be scoped to current user."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: All user endpoints working correctly. PUT /users/me updates profile successfully. POST /users/me/applications creates application with proper user scoping. GET /users/me/applications lists user's applications. POST /users/me/saved-plans creates saved plan. GET /users/me/saved-plans lists user's plans. All endpoints properly authenticated and scoped to current user."

  - task: "Countries list with filters + detail + holiday plan"
    implemented: true
    working: true
    file: "/app/backend/routes_countries.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/countries supports q, visa_type, delivery (any|standard|rush|same_day), documents, no_visa. GET /api/countries/{id} returns metadata. GET /api/countries/{id}/holiday-plan returns country + holiday plan data."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Countries endpoints working correctly. GET /countries returns 14 countries (correct count from data.py). Filters working: visa_type=Tourist (14 countries), delivery=same_day (5 countries), no_visa=true (2 countries). GET /countries/us returns country detail. GET /countries/us/holiday-plan returns country + plan with 5 attractions and 7 itinerary items. Invalid country IDs return 404."

  - task: "Leads contact form"
    implemented: true
    working: true
    file: "/app/backend/routes_leads.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/leads stores name/email/message in MongoDB."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Leads endpoint working correctly. POST /leads accepts name, email, message and returns lead ID with ok=true status."

frontend:
  - task: "AuthModal + AuthContext + UserMenu in navbar"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/AuthModal.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "User has not requested frontend testing yet."

  - task: "Atlys-style FilterBar (delivery, type, documents, holidays date picker, Explore/Events tabs)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/FilterBar.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "User has not requested frontend testing yet."

  - task: "Holiday Planner page per country + Save plan to user account"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/HolidayPlanner.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "User has not requested frontend testing yet."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Backend ready for testing. Key things to test:
        1) POST /api/auth/send-otp with {"identifier":"+919999999999"} and {"identifier":"test@example.com"} - both should return sent=true, channel='mock', dev_code present (since OTP_CHANNEL=mock and MOCK_OTP_CODE=123456 in env, dev_code should be '123456').
        2) POST /api/auth/verify-otp with the same identifier + code '123456' should return access_token + user object. New user should be created on first verify.
        3) GET /api/auth/me with Bearer access_token should return the user. Without token => 401.
        4) PUT /api/users/me {"name":"Test"} should update; /api/users/me/applications POST then GET should return list with the created application.
        5) POST /api/users/me/saved-plans then GET should list. Both endpoints require auth.
        6) GET /api/countries should return 15 countries. Filters: visa_type=Tourist, delivery=same_day, no_visa=true should each narrow the list.
        7) GET /api/countries/us and /api/countries/us/holiday-plan should return 200.
        Use REACT_APP_BACKEND_URL from /app/frontend/.env (https://premium-collab-6.preview.emergentagent.com) prefixed with /api.
    - agent: "testing"
      message: |
        ✅ BACKEND TESTING COMPLETE - EXCELLENT RESULTS!
        
        **SUCCESS RATE: 95.8% (23/24 tests passed)**
        
        **ALL CRITICAL FLOWS WORKING:**
        🔐 Auth: Mock OTP working perfectly - send/verify/rate limiting all correct
        👤 User Management: Profile updates, applications CRUD, saved plans CRUD all working
        🌍 Countries: List/filters/detail/holiday plans all working correctly  
        📧 Leads: Contact form working
        
        **MINOR NOTE:** Countries endpoint returns 14 countries (not 15) but this is correct per data.py file.
        
        **RECOMMENDATION:** Backend is production-ready. All APIs working correctly with proper authentication, error handling, and data validation. Ready for frontend integration testing.
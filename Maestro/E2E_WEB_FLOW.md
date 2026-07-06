# End-to-End (E2E) Test Flow

This document details the primary user journey for We Hive. This flow can be tested on Mobile via Maestro (using `my_web.yaml`), or implemented using Cypress/Playwright for desktop browser testing.

## Prerequisites
- **Target URL:** `https://wehive.co.in` (or local dev environment URL)
- **Database:** Ensure backend API is active and seeded.
- **Account:** A test account (`test@wehive.co.in`).

---

## E2E Scenario: The "Happy Path"

### 1. Landing & Branding
- **Action:** Navigate to the homepage.
- **Expected State:** Page loads without console errors.
- **Assertions:** 
  - The text "We Hive" is visible.
  - The hero section renders properly.

### 2. Authentication
- **Action:** Click on the **Login** button.
- **Expected State:** A modal or redirect to the login form appears.
- **Action:** Enter `test@wehive.co.in` as email (and password if required), and submit.
- **Assertions:**
  - The user is redirected to the **Dashboard**.
  - The "Welcome" message is visible.

### 3. AI Consultant Chat (Stark/Hive)
- **Action:** Navigate to the **Consultant** tab or open the Chat widget.
- **Expected State:** The chat interface opens.
- **Action:** Type *"What are the requirements for a US Student Visa?"* and send.
- **Assertions:**
  - The chat interface shows a typing indicator.
  - A response from the AI is returned containing the word "US" or "Requirements".
  - *(This explicitly tests the new tiered token routing system backend!).*

### 4. Eligibility Evaluator
- **Action:** Navigate to the **Evaluate** tab.
- **Action:** Select "Target Country" and enter "Canada".
- **Action:** Click "Evaluate Profile".
- **Assertions:**
  - A loading state appears.
  - An "Eligibility Score" or recommendation card is displayed on the screen.

### 5. University Exploration
- **Action:** Navigate to the **Universities** tab.
- **Action:** Focus on the search bar, type "Toronto", and press Enter.
- **Assertions:**
  - The search results update to show matching universities.
  - "Toronto" is visible in the university list.
- **Action:** Click on the university card.
- **Assertions:**
  - The university detail page opens.

---

*For mobile automation, run the maestro script from the terminal:*
```bash
maestro test Maestro/my_web.yaml
```

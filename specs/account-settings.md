📄 account-settings.md

PAGE: dashboard/settings/account/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

👤 Profile

* name
* email
* avatar

⸻

🔐 Security

* password
* 2FA_status

⸻

🏢 Organization

* org_name
* plan
* seats

⸻

⚙️ Preferences

* theme
* notifications

⸻

⚡ Actions

* update_profile
* change_password
* enable_2fa

⸻

⸻

🧱 2. Data Shape

type AccountSettings = {
profile: {
name: string
email: string
avatar?: string
}

security: {
two_factor: boolean
}

organization: {
name: string
plan: string
seats: number
}

preferences: {
theme: string
notifications: boolean
}
}

3. API Contracts

GET /api/v1/account

PUT /api/v1/account

POST /api/v1/account/password

POST /api/v1/account/2fa

⸻

🗄️ 4. DB Schema

users

* id
* name
* email
* password_hash

⸻

organizations

* id
* name
* plan

⸻

⸻

⚙️ 5. Execution Logic

* update user data
* validate security
* handle preferences

⸻

⸻

🧠 6. AI Layer

* detect weak security
* recommend upgrades
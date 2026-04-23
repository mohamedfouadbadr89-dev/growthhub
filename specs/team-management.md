📄 team-management.md

PAGE: dashboard/settings/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

🔍 Search

* search_query

⸻

👥 Team Table

* user_id
* name
* email
* role (admin | manager | viewer)
* status (active | invited | pending)
* joined_date

⸻

⚡ Actions

* invite_member
* edit_role
* remove_member

⸻

📊 Stats Cards

* total_members
* admin_count
* pending_invites

⸻

📄 Pagination

* page
* per_page
* total

⸻

⸻

🧱 2. Data Shape

type TeamMember = {
id: string
name: string
email: string
role: "admin" | "manager" | "viewer"
status: "active" | "invited" | "pending"
joined_at?: string
}

type TeamPage = {
members: TeamMember[]

summary: {
total: number
admins: number
pending: number
}

search: string

pagination: {
page: number
per_page: number
total: number
}
}

3. API Contracts

GET /api/v1/team

Query:

* search
* page

⸻

POST /api/v1/team/invite

body:

* email
* role

⸻

PUT /api/v1/team/:id

body:

* role

⸻

DELETE /api/v1/team/:id

⸻

⸻

🗄️ 4. DB Schema

team_members

* id
* org_id
* name
* email
* role
* status
* created_at

⸻

team_invites

* id
* email
* role
* status
* expires_at

⸻

⸻

⚙️ 5. Execution Logic

* fetch members
* filter + search
* update roles
* manage invites

⸻

⸻

🧠 6. AI Layer

* detect role misconfiguration
* suggest least-privilege roles

⸻

⸻

💳 7. Credits System

* NONE

⸻

🧠 8. AI Usage Classification

* role_recommendation → LOW

⸻

📊 9. Marketing Rules

* too many admins → risk
* inactive users → cleanup

⸻

🧾 10. Comments

* RBAC required
* org isolation
* audit logs
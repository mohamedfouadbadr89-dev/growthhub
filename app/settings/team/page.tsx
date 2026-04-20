"use client";

import {
  UserPlus,
  Filter,
  Download,
  Pencil,
  Trash2,
  Mail,
  X,
  CheckCircle2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

const STATS = [
  {
    label: "Total Members",
    value: "24",
    badge: "+2 this month",
    badgeStyle: "text-emerald-600 bg-emerald-50",
  },
  {
    label: "Admin Seats",
    value: "4",
    suffix: "/ 5 available",
    suffixStyle: "text-muted-foreground",
  },
  {
    label: "Pending Invitations",
    value: "3",
    valueStyle: "text-[#943700]",
    pulse: true,
  },
];

const MEMBERS = [
  {
    name: "Sarah Chen",
    joined: "Joined Oct 2023",
    email: "sarah.chen@cognitive-arch.ai",
    role: "Admin",
    roleStyle: "bg-primary/10 text-primary",
    status: "Active",
    statusDot: "bg-emerald-500",
    statusColor: "text-emerald-600",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDgKfNP7cJxu8HslthjQnl-IDBIRf7F3DSsrMgQKejFwcln4UXUbQE1tNreVNMJovHBdqfbC8RoCKaKAfMrzNAlmchXs51bigztaUFby1KhSmXOl_zMzdZXDKxbwOGdV88QJs7Mg-Qv4wOfF8b-GasOoQdS9zsYjLiO99IwXRwCDz499BSe13ZJIZkTB0HlmA8sgurscnU8o6JwRDysybQ8TDsf3grMG4_gRmkqvvU7eGHiLq7oTTjECfYTVM-PD_oeAWtgy8dvKiy",
    actions: [
      { Icon: Pencil, hoverBg: "hover:bg-primary/10", color: "text-primary" },
      { Icon: Trash2, hoverBg: "hover:bg-red-50",     color: "text-red-600" },
    ],
  },
  {
    name: "Marcus Thorne",
    joined: "Joined Sep 2023",
    email: "m.thorne@cognitive-arch.ai",
    role: "Manager",
    roleStyle: "bg-surface-container-high text-muted-foreground",
    status: "Active",
    statusDot: "bg-emerald-500",
    statusColor: "text-emerald-600",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhfgVbZ9OGyuppM7n7v3hcoJz00nPOuxphfx3zn7cS66egnpP2R7rPXrWYx9zQv1B7SqtfNii2PD7REM3pZjpZEWOE4LgGAU35-nQGakxzEjjdltgWzvk11mcJbBF4ogdOL0pg9LWvWqMN9hGmzmN8B1zqhaG9LdO-nKj6neFUps6TIue_FGrst3RXv9ZGUDn2DuFDszIBH7DwUBNpznQk_DIXQEvura6awQbIkrbvPje4GhAFDpFo2S6TLHSXYLO0e4cJrikJ9Wd9",
    actions: [
      { Icon: Pencil, hoverBg: "hover:bg-primary/10", color: "text-primary" },
      { Icon: Trash2, hoverBg: "hover:bg-red-50",     color: "text-red-600" },
    ],
  },
  {
    name: "Elena Lopez",
    joined: "Invited 2 days ago",
    email: "e.lopez@creative-partner.com",
    role: "Viewer",
    roleStyle: "bg-surface-container-high text-muted-foreground",
    status: "Invited",
    statusDot: "bg-primary animate-pulse",
    statusColor: "text-primary",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtE9u9IhDCPsm_mObkJyYqXeZrQNR2nDJrHN4UVrkUMI4hSWCOFn5fMTomH8z9jkpicUvH5fsG12afBEvwwOJIhPrsN3Rpv9FcKRo8P7vbucYRSDLsII754rx4DVieeecyFquUjG-JInKfbmjWf2oYoejfU5t5bovmhiSw-qsHGF9Z427-Ld4NerMv4vzK8duurAj1ul9hnMTR0Th3ZLiyBZmiitM_55Ec2KLknooPwIhaOra8g1BeKkoy7tmtCJb6wi6FuFb2rlkI",
    actions: [
      { Icon: Mail,  hoverBg: "hover:bg-primary/10", color: "text-primary" },
      { Icon: X,     hoverBg: "hover:bg-red-50",     color: "text-red-600" },
    ],
  },
  {
    name: "David Reed",
    joined: "Joined July 2023",
    email: "d.reed@cognitive-arch.ai",
    role: "Manager",
    roleStyle: "bg-surface-container-high text-muted-foreground",
    status: "Active",
    statusDot: "bg-emerald-500",
    statusColor: "text-emerald-600",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcK4YyeYgsdm_JuZkQn0-oPjubDYO495-aKXWJjVMcRdjXpRLTLPK17Ndj2OlFPvzeTrLFkUV_h3Rk67jIZQ67u6gX_Fbip-DLXPBNNd0eCbkrkUfelnCg9zkTTEMDROSfYgVpjb3rCB9IXXPXYoXiPXng2tv6klL1aGyQ8wTT6OxI55fDT5yTpWGoqnNVwg0524OPgr6trs8f_cfz2Pp3bDOKhxGEL9GNoePJMU_PsFDpKoLpTP8zItNqUaNcTld_MJq3hUQ3elPc",
    actions: [
      { Icon: Pencil, hoverBg: "hover:bg-primary/10", color: "text-primary" },
      { Icon: Trash2, hoverBg: "hover:bg-red-50",     color: "text-red-600" },
    ],
  },
  {
    name: "Kimberly Bell",
    joined: "Waiting for access",
    email: "k.bell@innovation-group.net",
    role: "Viewer",
    roleStyle: "bg-surface-container-high text-muted-foreground",
    status: "Pending",
    statusDot: "bg-[#943700]",
    statusColor: "text-[#943700]",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOAtS0ko1nTl7EsZVlz2GNeKReB09YjzsuZNW_OAl2sDtD4jMZQpAsMNNIcet_eKRMdP9IaCP0NZPz_Z-Pikl5Gurh_HlWWhwv0PnXcrhKG7sVdvG3j-ojr-VEI45rFsEfaF8uFnvXQPL9FAxgBlqSYrO3MF7XGQEubgYnWv8iFIte_SRzn0b1zwsqWuAH8XzpZctsAIxS3UMr_osQ7_lAZ8JrZWuR1xPe3BYDarVb2-BtEIerp5nZPQxnO6tzx2rLkdxTFtF03Wbs9",
    actions: [
      { Icon: CheckCircle2, hoverBg: "hover:bg-primary/10", color: "text-primary" },
      { Icon: Ban,          hoverBg: "hover:bg-red-50",     color: "text-red-600" },
    ],
  },
];

export default function TeamManagementPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Settings
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-sans">Team Management</h2>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all font-body">
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-2xl border border-border flex flex-col gap-1 hover:-translate-y-1 transition-transform duration-300 shadow-sm"
          >
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase font-body">
              {s.label}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tracking-tight font-sans ${s.valueStyle ?? "text-foreground"}`}>
                {s.value}
              </span>
              {s.badge && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full font-body ${s.badgeStyle}`}>
                  {s.badge}
                </span>
              )}
              {s.suffix && (
                <span className={`text-xs font-body ${s.suffixStyle}`}>{s.suffix}</span>
              )}
              {s.pulse && (
                <span className="h-2 w-2 rounded-full bg-[#943700] animate-pulse ml-1" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Team Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-border">
        <div className="px-8 py-6 flex justify-between items-center">
          <h3 className="text-base font-bold text-foreground font-sans">Team Directory</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-muted-foreground">
              <Filter size={18} />
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-muted-foreground">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Name", "Email Address", "Role", "Status", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-8 py-4 text-xs font-bold text-muted-foreground tracking-widest uppercase font-body ${i === 4 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {MEMBERS.map((m) => (
                <tr key={m.name} className="hover:bg-surface-container-low/30 transition-colors group">
                  {/* Name */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-surface-container-high border border-border shrink-0">
                        <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground font-body">{m.name}</div>
                        <div className="text-xs text-muted-foreground font-body">{m.joined}</div>
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-8 py-5 text-sm text-muted-foreground font-body">{m.email}</td>
                  {/* Role */}
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-body ${m.roleStyle}`}>
                      {m.role}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-8 py-5">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold font-body ${m.statusColor}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${m.statusDot}`} />
                      {m.status}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.actions.map(({ Icon, hoverBg, color }, i) => (
                        <button key={i} className={`p-2 ${hoverBg} rounded-lg ${color} transition-colors`}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-6 bg-surface-container-low/20 flex justify-between items-center border-t border-border">
          <span className="text-xs font-medium text-muted-foreground font-body">Showing 5 of 24 members</span>
          <div className="flex items-center gap-1">
            <button disabled className="p-1.5 hover:bg-surface-container-high rounded-lg text-muted-foreground disabled:opacity-30 transition-colors">
              <ChevronLeft size={18} />
            </button>
            {["1", "2", "3", "..."].map((p, i) => (
              <button
                key={p}
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors font-body ${
                  i === 0
                    ? "bg-primary text-white shadow-sm"
                    : "hover:bg-surface-container-high text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            <button className="p-1.5 hover:bg-surface-container-high rounded-lg text-muted-foreground transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Governance Note */}
      <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
        <Info size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-foreground font-body">System Governance Note</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1 font-body">
            Admins have full execution authority over campaigns and creative asset approval. Managers can initiate
            actions but require final sign-off from an Admin for high-budget automation triggers.
          </p>
        </div>
      </div>
    </div>
  );
}

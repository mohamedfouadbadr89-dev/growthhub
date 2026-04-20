"use client";

import { useState } from "react";
import { ArrowRight, Search, Download, MoreVertical } from "lucide-react";

const TOP_CREATIVES = [
  {
    badge: "Top 1%",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFrfVqb2kb0h27ujULcsI-vNbsHihPx2oxFSTyeS1zz6s_pnUoa1fskn-GdeEh9AMvh8bFfT0CxFV5xwor9rpBOul6Ainv5uuxcDm97s0-6DhtuTnuela8uOXhy-240ZuS78OQADaHDpKeV6-s9sWpisvQs8WdtZhxufhgOg8KEuZgrS2-jNrJ-zR9U_Sza95TBP7Cn0QAQbJNe0upilWIfbUwYl41Tk5Ex0nm2jD-_HzbMMr6tq_lFXOilqK0ZUleUtch-zTScQ",
    name: "Minimalist Workspace v2",
    type: "Video Ad • Facebook",
    ctr: "2.84%",
    roas: "5.2x",
    conv: "3,412",
  },
  {
    badge: "High ROI",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8oMRg64Dxmb6i_xeWspQPgHpB9o25P1ZG1jbYscivkl6O5QEMQv_GfBK-KdOPV-IoxNuMOzOGtIsBX6Wow1PvE-9mqdiq9xn0OCIJ4IY5Iev74XdTHLGTemlJsiZeNWMULPsJNTwTgrgcsah64O8VwFHjAnp5WAZylndwyUwWu2GEkNtMxvJZ8MY6zVPx1QmTOT7MOxG5uQOOvWun2LtroMBvdDrWBTz96CCjrhnSvPCZE-NuRMj0NkuRLb3fU8yIaEOLZ-30Hg",
    name: "Data Flow Abstract",
    type: "Image • Instagram",
    ctr: "2.41%",
    roas: "4.8x",
    conv: "1,892",
  },
  {
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdShjGcSH2oL1O4kUUZTPAvwStyefz-IL_WOUoNoksY_8wY34sC90YKTgBVAqDXyX_ard6Een52Ugebvk2kCBSoqcmHmJIF7RsEnAc2hCBOZCP3q2lM9hDXvgwlmSpRLPNatKvwrGNeQG5YcQUYBcVFLPYhPVDvS0SOn0AWoHFMkcUFEbzQKnp9p4utOiUgxflPCWFHDzU34TGXhKgzozZi_h7vkFu0B-FJeRIJRxwhqvDVlmeH64O-9IJ6o9gnmWkDXoL5Iov5g",
    name: "Premium Tech Showcase",
    type: "Video Ad • LinkedIn",
    ctr: "2.12%",
    roas: "4.2x",
    conv: "1,240",
  },
  {
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7L7K4wJTl40xJrE7csbLQ72HTW_zNuqpPPmAAL9mKLCeQcCCWgzb7pI4SiAw2x3bSXG38NfSueLIcKcddCdCzT5H-otVBcfxC5SJnrqD0s92Z5ER-B0xKvGraKPhD5D6KdwYmFsYHy1RMZSjI1h-VEzWfuLtQCywql3_4WfkB2dM73DXVFbreCcDCR95xUq4ckDEjipqRXjuQbTZEbGudJa7vfhmYf0eeaBAYc-rlwhYAbywiPqZNybxpMwK4FjOrOZzzdCvtWA",
    name: "Team Synergy Concept",
    type: "Image • Multi-Channel",
    ctr: "1.95%",
    roas: "3.9x",
    conv: "2,105",
  },
];

const UNDER_CREATIVES = [
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCo40LaarfljIV7nqhMoJ14jOLOQH2P_wyZBxrrmI1zcE0HYt3LHB9HQBkgyJ3CKTwy0tM31xiEDkQIxplukGEV4URCflIdm_fn5rH4Hy8lZ5AdpuGgmKGeyL58F3mjHCUEktxJZFpPR470QYYnCussslv0pF3CBX-kY0TEnC61xjFfLu-P0vdSS50ydo9utHfZmahs3ptS-wakoBfSzVxNp8XA6PF5KNs9FfClCDC4TJQyT-NSaVVMm3DJiAjCNn_JqFpHrPMktw",
    name: "Generic Meeting V1",
    ctr: "0.45%",
    roas: "0.8x",
    barWidth: "15%",
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDNtEVGGkqJ7RUpjwllYJDZ8olEFuRtS18V8HVm2lAFim3XGcGQw5Z1CnOEZt_42vFRv485D0LU9CyPvk5nDpvTH_HAvyvz-qj8HOLk3Na5m_qewMYcZR5HaFH222vhgKEN_yj3H_TVnMDH86CMw-A4TlVvzTD29g84UgVXkVDnZayXCv_J0POZn3ZbLlHjZ-jfa45c_ZFllFVqOnvIkQfa7Lkca1Gy7KbO6EE6lPaAneiPldB_K41sP5jlGza90zHGmITCzJGJFw",
    name: "Busy Desk Static",
    ctr: "0.62%",
    roas: "1.1x",
    barWidth: "25%",
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCeqaXaQxN5ZTIOohSOZbVfEjrfEDpwfnuPOF-bPq7in8a_dAFkvlbm-fGMF3A2dKe52cmS67-o19uTgOpERKGqovqy0pO-OzHbylH0Z3xigwL_UdxjFc0JH6lQ3ZdIN1sT5LKyIYDexlpX6xYOaLSzh8prw9SA9SVnTKRFz765DiUX2R-St00_FO0RZEG2oIkAbjfYdQmSFM2fryIQZV5UG5mgpYgk3he6xpSyWc_ZjS2jzKuqOYHjybpUH6BZqQkuCpwAglB4-w",
    name: "Office Empty Space",
    ctr: "0.51%",
    roas: "0.9x",
    barWidth: "18%",
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyytcZJoAAjgdH0DLTf_XyvVU6phNfnMQNeSGHhBspfdCD-7XjDoJInnWTHvDdVr9PpJvMDnq0S4GQtlJx_66YKSd5KN78pCFMCnsC_ni5la02bR-jiRjoEqAyTHHeQOs9rRLMx3TZrWAVDJlsa3u4SoqJyhDoHp_A85oJ6FqjRNxdZr9qDPa2sLimxu7NmnjBdSlQM5cU4zEJ-Q4QkM6oN-AdhBfvtfW183IZgVDoKzANhgqU7pwDFGa3dIj1T1eIQ_SEWVCICg",
    name: "Typing Close Up",
    ctr: "0.78%",
    roas: "1.4x",
    barWidth: "30%",
  },
];

const TABLE_ROWS = [
  {
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ8AIDFAbMpJB9WmYfYH_Ap6xNvUJe19Xhmh1-uG8i0sBeaEtVpHFhRcRn8q573lgQCUQb_4r3fK4LToF9dVkhr5-gW3Q6ZNuQmZt1q6CnGiceSfMvMbwhnVcNz-Yq8g64ITrUO936uXDRqNkzdfFnC4EFAl8Kvq16J0WERbDD1wxt1W2wWRdc6Tro8W9Lr52iu5OiHgUTJ3-caxF-Bq1nW1z5V8MlSdA27qkRFNkKpqlJE9Fo0QK3Rz2UCJWu0ap5i0Ydf3i7Sw",
    name: "Minimalist Workspace v2", format: "Video", spend: "$12,450",
    ctr: "2.84%", ctrColor: "text-primary", roas: "5.2x", status: "Active", statusStyle: "bg-green-100 text-green-700", dotStyle: "bg-green-600",
  },
  {
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuBaM6K24OzeSX5kLS3ghAtMas4OOTYBeL2kS5DxGU-uPlurk76j4w7Iuf9bznamWqB23iRPLA_Lv31AsZ8yr--JYK2irAVfV_0yq-ACHbRUpjAwmRyRSxiR13MCF1MFvyyBxbO3iqQSiTFmIotwOY0GbHsfS3j7V1o_WJ3hoGqTjVZ25yQoJ6jHi7HbDyr9aI2OviSgWyVLUtwiVkMBXEdTTJ4Wg6f5Fa1o-ShLGvuSaJutnjGT3ZqHxUsLHWKyPmOuArXV_Zj9NA",
    name: "Data Flow Abstract", format: "Image", spend: "$8,120",
    ctr: "2.41%", ctrColor: "text-primary", roas: "4.8x", status: "Active", statusStyle: "bg-green-100 text-green-700", dotStyle: "bg-green-600",
  },
  {
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZmUU9COoG6lrX7lx30roZaGNnuB-sLtSwJmtcPE6JYh7euK3vpAEYFwEiU84U5QG6WlxhnX66jY3wNhoVVB_3gv3jPwOW1kVWDyZKihKrQlszkzn9nn2aZa2j4ZN9jQje1vUJOYEUXosxdELzjRpI4ZjUZJ0mnu7SjmStCXscU0gXHlLmZc14cXMBCY67QeMNBFVnxLLYeS8e0oE7NuyXV869a5hp7rbr8Zp1Ji8avaEuj5GcQ6D6xegxoIQcUSxw--Rp0WCzRw",
    name: "Generic Meeting V1", format: "Video", spend: "$3,500",
    ctr: "0.45%", ctrColor: "text-error", roas: "0.8x", status: "Paused", statusStyle: "bg-surface-container-low text-muted-foreground", dotStyle: "bg-[#575f72]",
  },
  {
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuArr9XWxf6sSZXjlMAVxq2S-7JKHHuph83mTVEG_Grnp1km1LHcPwzb0xvK-aJ0mK6aSPP8ZAU4zHWAvAIQ1Ol4rb163ILERsRx5IIJw_7trBlHI-U9IR4sFtGRUWxaXBaJ9DYm_fvfU4xTFkx2tiubNSGtg-KzsDCq7zEnr4zlfAaXV7NslhuZxj2gz-Q6Kdpu-MTULukM4Un_VHfqsuNFuNzWeMt0aDoPf_KrxnP1BMAS5PLBsceXsjzfnT8crP6ZaQZwO4ZQ",
    name: "Premium Tech Showcase", format: "Video", spend: "$15,200",
    ctr: "2.12%", ctrColor: "text-primary", roas: "4.2x", status: "Active", statusStyle: "bg-green-100 text-green-700", dotStyle: "bg-green-600",
  },
  {
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgrXTeiMU-9SmVzryp7b3qPoeSLTo7zRkRJ9a9PeuSVg1fchSu_Io9XFuSbFBmJ1Grx7ecoE9Vj2-L-zqmJ5uXOIvdnRqTQZd7UWIvtH8atuoN1BQYD5KtGxhQqlMJ-px_5Qbk2Ik4jA-n1bxf8UaEtWIYPeiysC1bIKHkwY273ThAH_RrsQnhIOrthuVbCGnpkthQFSqYKJMFaFhcDWmBLYWwQwar-ObeQfPuyz-WGF7HmfudAFTLNW6m6mb3NbCHJveB99SUnw",
    name: "Busy Desk Static", format: "Image", spend: "$1,200",
    ctr: "0.62%", ctrColor: "text-error", roas: "1.1x", status: "Paused", statusStyle: "bg-surface-container-low text-muted-foreground", dotStyle: "bg-[#575f72]",
  },
];

export default function CreativePage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-12">
      {/* Top Performing Creatives */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold font-sans text-foreground tracking-tight mb-1">
              Top Performing Creatives
            </h2>
            <p className="text-muted-foreground text-sm font-body">
              Visual assets with the highest engagement and ROI across all platforms.
            </p>
          </div>
          <button className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline font-body">
            View Detailed Report <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOP_CREATIVES.map((c) => (
            <div
              key={c.name}
              className="bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-shadow duration-300"
            >
              <div className="aspect-4/5 relative overflow-hidden">
                <img
                  src={c.img}
                  alt={c.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {c.badge && (
                  <div className="absolute top-3 left-3 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-body">
                    {c.badge}
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-foreground text-sm truncate font-sans">{c.name}</h4>
                  <p className="text-xs text-muted-foreground font-body">{c.type}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold font-body">CTR</p>
                    <p className="text-sm font-bold text-primary font-sans">{c.ctr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold font-body">ROAS</p>
                    <p className="text-sm font-bold text-foreground font-sans">{c.roas}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold font-body">Conv.</p>
                    <p className="text-sm font-bold text-foreground font-sans">{c.conv}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Underperforming Creatives */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold font-sans text-foreground tracking-tight mb-1">
              Underperforming Creatives
            </h2>
            <p className="text-muted-foreground text-sm font-body">
              Assets requiring optimization or retirement based on current metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {UNDER_CREATIVES.map((c) => (
            <div
              key={c.name}
              className="bg-white/60 rounded-xl overflow-hidden group grayscale hover:grayscale-0 transition-all duration-300"
            >
              <div className="aspect-video relative overflow-hidden">
                <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-error/10" />
              </div>
              <div className="p-4 space-y-3">
                <h4 className="font-bold text-foreground text-sm truncate font-sans">{c.name}</h4>
                <div className="flex justify-between items-center text-xs font-body">
                  <span className="text-muted-foreground font-medium">
                    CTR: <span className="text-error">{c.ctr}</span>
                  </span>
                  <span className="text-muted-foreground font-medium">
                    ROAS: <span className="text-error">{c.roas}</span>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-error h-full rounded-full" style={{ width: c.barWidth }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Creative Performance Table */}
      <section>
        <div className="bg-white rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-container-low/30">
            <h2 className="text-xl font-bold font-sans text-foreground tracking-tight">
              Creative Performance Table
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 font-body"
                  placeholder="Search creatives..."
                  type="text"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-surface-container-low transition-colors font-body">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low/50 text-muted-foreground font-semibold">
                  {["Thumbnail", "Creative Name", "Format", "Spend", "CTR", "ROAS", "Status", ""].map((h) => (
                    <th key={h} className={`px-6 py-4 font-body text-xs ${h === "" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TABLE_ROWS.filter((r) =>
                  r.name.toLowerCase().includes(search.toLowerCase())
                ).map((row) => (
                  <tr key={row.name} className="hover:bg-surface-container-low/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-12 h-8 rounded bg-surface-container-high overflow-hidden">
                        <img src={row.thumb} alt={row.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground font-body">{row.name}</td>
                    <td className="px-6 py-4 font-body text-foreground">{row.format}</td>
                    <td className="px-6 py-4 font-body text-foreground">{row.spend}</td>
                    <td className={`px-6 py-4 font-semibold font-body ${row.ctrColor}`}>{row.ctr}</td>
                    <td className="px-6 py-4 font-semibold font-body text-foreground">{row.roas}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${row.statusStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.dotStyle}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-muted-foreground hover:text-primary transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-surface-container-low/10 font-body">
            <p>Showing 1–5 of 42 creatives</p>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded border border-border hover:bg-surface-container-low disabled:opacity-50">Prev</button>
              <button className="px-3 py-1 rounded bg-primary text-white">1</button>
              <button className="px-3 py-1 rounded border border-border hover:bg-surface-container-low">2</button>
              <button className="px-3 py-1 rounded border border-border hover:bg-surface-container-low">3</button>
              <button className="px-3 py-1 rounded border border-border hover:bg-surface-container-low">Next</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

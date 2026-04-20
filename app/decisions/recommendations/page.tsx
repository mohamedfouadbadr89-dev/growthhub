"use client";

import { CreditCard, Paintbrush, Users, TrendingDown, TrendingUp, Zap, UserPlus, ArrowUp, BarChart2 } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* Hero Header */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-2 font-sans">
          Recommendations
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl font-light font-body">
          Personalized AI strategies to optimize your campaign performance using real-time market signals.
        </p>
      </div>

      {/* Budget Recommendations */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary p-2 rounded-lg">
            <CreditCard size={20} />
          </span>
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground font-body">
            Budget Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Budget Card 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-[#007f36]/10 text-[#006329] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-body">
                High Impact
              </span>
              <span className="text-xs font-bold text-muted-foreground font-body">ID: B-092</span>
            </div>
            <h4 className="text-lg font-bold leading-tight mb-4 font-sans">
              Reallocate Budget to High-Performing Search Ads
            </h4>
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 font-body">
                  What to do
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  Shift $2,500 from low-performing Display to Brand Search.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 font-body">
                  Why
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  Search CTR is 4.2x higher than current display average.
                </p>
              </div>
            </div>
            <div className="bg-[#007f36]/5 p-4 rounded-lg flex items-center justify-between mb-6">
              <span className="text-xs font-medium text-[#006329] font-body">Expected Result</span>
              <span className="text-lg font-extrabold text-[#006329] font-sans">+15% ROI</span>
            </div>
            <div className="flex gap-3 mt-auto">
              <button className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity active:scale-[0.98] font-body">
                Apply
              </button>
              <button className="flex-1 bg-surface-container-high text-foreground py-2.5 rounded-lg text-sm font-bold hover:bg-surface-container-highest transition-colors font-body">
                Dismiss
              </button>
            </div>
          </div>

          {/* Budget Card 2 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-surface-container-low text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-body">
                Medium Impact
              </span>
              <span className="text-xs font-bold text-muted-foreground font-body">ID: B-104</span>
            </div>
            <h4 className="text-lg font-bold leading-tight mb-4 font-sans">
              Increase Weekend Spend for 'Home' Category
            </h4>
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 font-body">
                  What to do
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  Increase Saturday-Sunday daily cap by 20%.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 font-body">
                  Why
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  Conversion rates spike by 35% on weekends for this category.
                </p>
              </div>
            </div>
            <div className="bg-[#007f36]/5 p-4 rounded-lg flex items-center justify-between mb-6">
              <span className="text-xs font-medium text-[#006329] font-body">Expected Result</span>
              <span className="text-lg font-extrabold text-[#006329] font-sans">+8% ROAS</span>
            </div>
            <div className="flex gap-3 mt-auto">
              <button className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity active:scale-[0.98] font-body">
                Apply
              </button>
              <button className="flex-1 bg-surface-container-high text-foreground py-2.5 rounded-lg text-sm font-bold hover:bg-surface-container-highest transition-colors font-body">
                Dismiss
              </button>
            </div>
          </div>

          {/* Budget Summary Bento */}
          <div className="bg-[#2563eb] text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-6 font-body">
                Strategy Summary
              </h4>
              <div className="text-4xl font-black mb-2 tracking-tighter font-sans">$42.8k</div>
              <p className="text-xs opacity-80 font-body">Total Potential ROI Savings</p>
            </div>
            <div className="relative z-10 mt-8">
              <div className="w-full bg-white/20 h-1.5 rounded-full mb-2 overflow-hidden">
                <div className="bg-white h-full w-2/3 rounded-full" />
              </div>
              <p className="text-[10px] font-bold font-body">Optimization Score: 68/100</p>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-10 scale-150">
              <BarChart2 size={120} />
            </div>
          </div>
        </div>
      </section>

      {/* Creative Recommendations */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary p-2 rounded-lg">
            <Paintbrush size={20} />
          </span>
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground font-body">
            Creative Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Creative Card 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-48 bg-surface-container-high shrink-0">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz9bCAlQ2NmN8WvWpDP3AFfJzolzfGitsWM8TqtXrBkmxAiNxyKfwz9qYtUj1EZQbgjJkLFR16KYRw0xonDXKpwuce1whP6TiHcap2g-yg-gQa3Nwg5Z4KGY2aPqZBizvfQMU784bb1cDhul3yAnBWv5FUzF22EJxyY0ynGlJpS2TegZ6UHA6A0WKYfW6M9hkz0Xv8sQtsudY2OCszZs3-FzpDDbU4PYj__Mq3Gh3svMAnm2BmxvOHBOMj06lUpcCjpNTnJIzoA-g"
                alt="Social Media Mockup"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1">
              <div className="flex justify-between mb-4">
                <h4 className="text-lg font-bold font-sans">Update Video Ad for Meta</h4>
                <span className="text-error font-black text-[10px] uppercase tracking-tighter font-body">
                  Fatigue Detected
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 font-body">
                Current asset has been served 500k+ times. Frequency is reaching 6.2, leading to diminishing returns.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#007f36]/5 px-3 py-1.5 rounded flex items-center gap-2">
                  <TrendingDown size={14} className="text-[#006329]" />
                  <span className="text-xs font-bold text-[#006329] font-body">Lower CPA (-12%)</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity font-body">
                  Swap Asset
                </button>
                <button className="bg-surface-container-high text-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-surface-container-highest transition-colors font-body">
                  View Specs
                </button>
              </div>
            </div>
          </div>

          {/* Creative Card 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-48 bg-surface-container-high shrink-0">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLEWwluUAaul3LeOcD4YecN2zLW9G3JfDzs3rb-jmzsjagalD9LiJGjcd12-qH63k1FY1IYqOSJ8MfkJkyzyc1pF5zU85ifF291zzSIMBFbgJVPxiyViMPaMchhUdH3gEgFTRUrZwKkoBKHB9uuF92MVG5dbeejZR_NRROZWCFd-54Wqt3MnWwCD1zsKGhjQv8UOZf6VxgjRrl_eJtBHne1aOcpzSBKxygDJ9FCt18M1oSESXY2BUmg3RMDfP43VY_1g14YeRqm4s"
                alt="Desktop Display Banner"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1">
              <div className="flex justify-between mb-4">
                <h4 className="text-lg font-bold font-sans">A/B Test Static Banners</h4>
                <span className="text-primary font-black text-[10px] uppercase tracking-tighter font-body">
                  New Opportunity
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 font-body">
                Introduce 'Direct' vs 'Curiosity' headline variants for the B2B SaaS landing page.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#007f36]/5 px-3 py-1.5 rounded flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#006329]" />
                  <span className="text-xs font-bold text-[#006329] font-body">Higher CTR (+4.5%)</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity font-body">
                  Launch Test
                </button>
                <button className="bg-surface-container-high text-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-surface-container-highest transition-colors font-body">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Recommendations */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary p-2 rounded-lg">
            <Users size={20} />
          </span>
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground font-body">
            Audience Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Audience Card */}
          <div className="lg:col-span-3 bg-white p-8 rounded-2xl shadow-sm border border-border">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary font-body">Audience Growth</span>
                  <Zap size={14} className="text-primary" />
                </div>
                <h4 className="text-2xl font-extrabold mb-4 font-sans">
                  Expand Targeting to Lookalike Audience 1%
                </h4>
                <p className="text-muted-foreground mb-6 leading-relaxed font-body">
                  Your 'Customer LTV' seed audience has reached critical mass. Creating a 1% Lookalike in North America
                  will unlock an estimated 2.4M high-intent users.
                </p>
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight font-body">
                      Est. Reach
                    </p>
                    <p className="text-sm font-bold text-foreground font-body">2.4M - 3.1M</p>
                  </div>
                  <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight font-body">
                      CPA Trend
                    </p>
                    <p className="text-sm font-bold text-[#006329] font-body">$-4.20 (-18%)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-body">
                    Generate Audience
                  </button>
                  <button className="text-muted-foreground font-bold px-4 py-3 hover:text-foreground transition-colors font-body">
                    View Insights
                  </button>
                </div>
              </div>

              <div className="w-full md:w-64 aspect-square bg-surface-container-low rounded-full flex items-center justify-center relative shrink-0">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20 animate-spin" style={{ animationDuration: "20s" }} />
                <div className="w-48 h-48 bg-[#2563eb] rounded-full flex items-center justify-center shadow-2xl">
                  <UserPlus size={56} className="text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Mini Stats Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 font-body">
                Total Suggestions
              </p>
              <div className="text-3xl font-extrabold text-foreground font-sans">14</div>
              <div className="text-xs text-[#006329] mt-1 flex items-center gap-1 font-body">
                <ArrowUp size={12} /> +4 from yesterday
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 font-body">
                Applied Rate
              </p>
              <div className="text-3xl font-extrabold text-foreground font-sans">42%</div>
              <div className="w-full bg-surface-container-low h-1 mt-4 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "42%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

alter table "public"."subscriptions" drop constraint "subscriptions_org_id_fkey";

alter table "public"."users" drop constraint "users_org_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(org_id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_org_id_fkey";

alter table "public"."users" add constraint "users_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(org_id) not valid;

alter table "public"."users" validate constraint "users_org_id_fkey";



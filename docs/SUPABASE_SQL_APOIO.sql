-- SQL de apoio baseado no comportamento esperado do projeto.
-- Revise os nomes das colunas no seu banco antes de rodar em produção.

-- 1) Seed dos planos VIP
insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select 'Mensal', 10, 30, false, false, true
where not exists (select 1 from membership_plans where name = 'Mensal');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select 'Bimestral', 20, 60, false, false, true
where not exists (select 1 from membership_plans where name = 'Bimestral');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select 'Trimestral', 30, 90, false, false, true
where not exists (select 1 from membership_plans where name = 'Trimestral');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select '1 Ano', 100, 365, false, false, true
where not exists (select 1 from membership_plans where name = '1 Ano');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select '2 Anos', 200, 730, false, false, true
where not exists (select 1 from membership_plans where name = '2 Anos');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select '3 Anos', 300, 1095, false, false, true
where not exists (select 1 from membership_plans where name = '3 Anos');

insert into membership_plans (name, price_brl, duration_days, is_recurring, is_lifetime, is_active)
select 'Vitalício', 1000, null, false, true, true
where not exists (select 1 from membership_plans where name = 'Vitalício');

-- 2) Checklist manual recomendado
-- - confirmar existência das views:
--   active_memberships
--   membership_admin_list
--   membership_orders_admin
--   profile_activity_summary
--   profile_received_summary
--   profile_watch_history
--   video_comments_with_profiles
--   community_comments_with_profiles
--   community_posts_feed
-- - revisar RLS para videos, memberships, membership_orders e profiles
-- - revisar colunas em PT/EN para manter consistência

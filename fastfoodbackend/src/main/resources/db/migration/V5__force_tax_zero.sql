insert into app_setting (setting_key, setting_value, updated_at)
select 'tax_rate', '0.00', current_timestamp
where not exists (
    select 1
    from app_setting
    where setting_key = 'tax_rate'
);

update app_setting
set setting_value = '0.00',
    updated_at = current_timestamp
where setting_key = 'tax_rate';

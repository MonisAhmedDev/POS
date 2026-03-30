alter table menu_item
    add column if not exists discount decimal(10,2) not null default 0.00;

alter table app_user
    add column if not exists restaurant_discount_type varchar(32);

alter table app_user
    add column if not exists restaurant_discount_value decimal(10,2) not null default 0.00;

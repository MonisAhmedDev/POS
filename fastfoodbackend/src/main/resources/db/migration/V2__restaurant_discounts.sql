alter table menu_item
    add column discount decimal(10,2) not null default 0.00;

alter table app_user
    add column restaurant_discount_type varchar(32);

alter table app_user
    add column restaurant_discount_value decimal(10,2) not null default 0.00;

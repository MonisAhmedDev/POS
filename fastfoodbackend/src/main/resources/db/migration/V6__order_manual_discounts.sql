alter table shop_order
    add column manual_discount_type varchar(32);

alter table shop_order
    add column manual_discount_value decimal(10,2) not null default 0.00;

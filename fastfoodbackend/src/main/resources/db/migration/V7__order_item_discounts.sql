alter table order_item
    add column discount decimal(10,2) not null default 0.00;

alter table order_item
    add column manual_discount_type varchar(32);

alter table order_item
    add column manual_discount_value decimal(10,2) not null default 0.00;

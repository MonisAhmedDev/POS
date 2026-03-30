alter table shop_order
    add column if not exists paid boolean not null default false;

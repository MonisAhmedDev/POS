create table app_user (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    name varchar(120) not null,
    email varchar(180) not null unique,
    password_hash varchar(255) not null,
    role varchar(32) not null,
    super_admin boolean not null
);

create table menu_item (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    name varchar(160) not null,
    category varchar(64) not null,
    price decimal(10,2) not null,
    description varchar(1000) not null,
    icon varchar(16) not null,
    image_path varchar(512),
    available boolean not null
);

create table coupon (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    code varchar(64) not null unique,
    discount_type varchar(32) not null,
    discount_value decimal(10,2) not null,
    min_order_amount decimal(10,2) not null,
    applicable_category varchar(64),
    status varchar(32) not null
);

create table cart (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    user_id varchar(64) not null unique,
    coupon_id varchar(64),
    constraint fk_cart_user foreign key (user_id) references app_user(id) on delete cascade,
    constraint fk_cart_coupon foreign key (coupon_id) references coupon(id) on delete set null
);

create table cart_item (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    cart_id varchar(64) not null,
    menu_item_id varchar(64) not null,
    quantity integer not null,
    constraint fk_cart_item_cart foreign key (cart_id) references cart(id) on delete cascade,
    constraint fk_cart_item_menu foreign key (menu_item_id) references menu_item(id) on delete cascade,
    constraint uq_cart_item unique (cart_id, menu_item_id)
);

create table shop_order (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    customer_id varchar(64),
    customer_name varchar(160) not null,
    cashier_id varchar(64),
    cashier_name varchar(160),
    subtotal decimal(10,2) not null,
    discount decimal(10,2) not null,
    delivery decimal(10,2) not null,
    tax decimal(10,2) not null,
    total decimal(10,2) not null,
    coupon_code varchar(64),
    payment_method varchar(32) not null,
    delivery_name varchar(160),
    phone varchar(64),
    address varchar(500),
    status varchar(32) not null,
    constraint fk_order_customer foreign key (customer_id) references app_user(id) on delete cascade,
    constraint fk_order_cashier foreign key (cashier_id) references app_user(id) on delete set null
);

create table order_item (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    order_id varchar(64) not null,
    menu_item_id varchar(64),
    name varchar(160) not null,
    category varchar(64) not null,
    icon varchar(16) not null,
    price decimal(10,2) not null,
    quantity integer not null,
    constraint fk_order_item_order foreign key (order_id) references shop_order(id) on delete cascade
);

create table feedback_entry (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    customer_id varchar(64) not null,
    customer_name varchar(160) not null,
    order_id varchar(64) not null unique,
    order_ref varchar(16) not null,
    rating integer not null,
    comment varchar(2000),
    constraint fk_feedback_customer foreign key (customer_id) references app_user(id) on delete cascade,
    constraint fk_feedback_order foreign key (order_id) references shop_order(id) on delete cascade
);

create table app_setting (
    setting_key varchar(120) primary key,
    setting_value text not null,
    updated_at timestamp not null
);

create table refresh_token (
    id varchar(64) primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    user_id varchar(64) not null,
    token_id varchar(120) not null unique,
    expires_at timestamp not null,
    revoked_at timestamp,
    constraint fk_refresh_user foreign key (user_id) references app_user(id) on delete cascade
);

create index idx_order_customer on shop_order(customer_id);
create index idx_order_status on shop_order(status);
create index idx_feedback_customer on feedback_entry(customer_id);
create index idx_refresh_expires on refresh_token(expires_at);

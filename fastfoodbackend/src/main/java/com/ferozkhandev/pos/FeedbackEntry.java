package com.ferozkhandev.pos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "feedback_entry")
public class FeedbackEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserAccount customer;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private ShopOrder order;

    @Column(name = "order_ref", nullable = false, length = 16)
    private String orderRef;

    @Column(nullable = false)
    private int rating;

    @Column(length = 2000)
    private String comment;
}

package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.OrderStatus;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackEntryRepository feedbackEntryRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final ApiMapper apiMapper;

    public FeedbackResponse submit(UserAccount customer, FeedbackSubmitRequest request) {
        ShopOrder order = shopOrderRepository.findById(request.orderId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot review this order.");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only delivered orders can be reviewed.");
        }
        if (feedbackEntryRepository.existsByOrder_Id(order.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Feedback has already been submitted for this order.");
        }
        FeedbackEntry entry = new FeedbackEntry();
        entry.setCustomer(customer);
        entry.setCustomerName(customer.getName());
        entry.setOrder(order);
        entry.setOrderRef("#" + order.getId().substring(Math.max(0, order.getId().length() - 6)).toUpperCase());
        entry.setRating(request.rating());
        entry.setComment(request.comment());
        return apiMapper.toFeedback(feedbackEntryRepository.save(entry));
    }

    public List<FeedbackResponse> myFeedback(UserAccount customer) {
        return feedbackEntryRepository.findByCustomer_IdOrderByCreatedAtDesc(customer.getId()).stream().map(apiMapper::toFeedback).toList();
    }

    public List<FeedbackResponse> allFeedback() {
        return feedbackEntryRepository.findAllByOrderByCreatedAtDesc().stream().map(apiMapper::toFeedback).toList();
    }
}

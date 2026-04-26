package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.OrderStatus;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class OrderHistoryService {

    private static final LocalTime BUSINESS_DAY_CUTOFF = LocalTime.of(4, 0);
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("EEE, MMM d");
    private static final DateTimeFormatter WEEK_LABEL = DateTimeFormatter.ofPattern("MMM d, uuuu");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMMM uuuu");

    private final ShopOrderRepository shopOrderRepository;
    private final ApiMapper apiMapper;

    public OrderHistoryReportResponse buildReport() {
        ZoneId zone = ZoneId.systemDefault();
        Instant now = Instant.now();
        LocalDate currentBusinessDate = toBusinessDate(now, zone);
        List<ShopOrder> orders = shopOrderRepository.findAllByOrderByCreatedAtDesc();

        List<ShopOrder> currentOrders = new ArrayList<>();
        Map<LocalDate, List<ShopOrder>> daily = new TreeMap<>(Comparator.reverseOrder());
        Map<LocalDate, List<ShopOrder>> weekly = new TreeMap<>(Comparator.reverseOrder());
        Map<YearMonth, List<ShopOrder>> monthly = new TreeMap<>(Comparator.reverseOrder());

        for (ShopOrder order : orders) {
            LocalDate businessDate = toBusinessDate(order.getCreatedAt(), zone);
            long ageDays = ChronoUnit.DAYS.between(businessDate, currentBusinessDate);

            if (ageDays <= 0) {
                currentOrders.add(order);
            } else if (ageDays < 7) {
                daily.computeIfAbsent(businessDate, ignored -> new ArrayList<>()).add(order);
            } else if (ageDays < 30) {
                LocalDate weekStart = businessDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                weekly.computeIfAbsent(weekStart, ignored -> new ArrayList<>()).add(order);
            } else {
                YearMonth yearMonth = YearMonth.from(businessDate);
                monthly.computeIfAbsent(yearMonth, ignored -> new ArrayList<>()).add(order);
            }
        }

        return new OrderHistoryReportResponse(
            now,
            zone.getId(),
            BUSINESS_DAY_CUTOFF.getHour(),
            buildBucket(
                "current",
                "Current Business Day",
                businessDateStart(currentBusinessDate, zone).toInstant(),
                businessDateStart(currentBusinessDate.plusDays(1), zone).toInstant(),
                currentOrders
            ),
            daily.entrySet().stream()
                .map(entry -> buildBucket(
                    "day",
                    DAY_LABEL.format(entry.getKey()),
                    businessDateStart(entry.getKey(), zone).toInstant(),
                    businessDateStart(entry.getKey().plusDays(1), zone).toInstant(),
                    entry.getValue()
                ))
                .toList(),
            weekly.entrySet().stream()
                .map(entry -> buildBucket(
                    "week",
                    "Week of " + WEEK_LABEL.format(entry.getKey()),
                    businessDateStart(entry.getKey(), zone).toInstant(),
                    businessDateStart(entry.getKey().plusDays(7), zone).toInstant(),
                    entry.getValue()
                ))
                .toList(),
            monthly.entrySet().stream()
                .map(entry -> buildBucket(
                    "month",
                    MONTH_LABEL.format(entry.getKey()),
                    businessDateStart(entry.getKey().atDay(1), zone).toInstant(),
                    businessDateStart(entry.getKey().plusMonths(1).atDay(1), zone).toInstant(),
                    entry.getValue()
                ))
                .toList()
        );
    }

    private OrderHistoryBucketResponse buildBucket(
        String periodType,
        String label,
        Instant periodStart,
        Instant periodEnd,
        List<ShopOrder> orders
    ) {
        List<ShopOrder> sortedOrders = orders.stream()
            .sorted(Comparator.comparing(ShopOrder::getCreatedAt).reversed())
            .toList();

        int paidOrderCount = (int) sortedOrders.stream().filter(ShopOrder::isPaid).count();
        int deliveredOrderCount = (int) sortedOrders.stream().filter(order -> order.getStatus() == OrderStatus.DELIVERED).count();
        int cancelledOrderCount = (int) sortedOrders.stream().filter(order -> order.getStatus() == OrderStatus.CANCELLED).count();
        BigDecimal salesTotal = sortedOrders.stream()
            .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
            .map(ShopOrder::getTotal)
            .reduce(MoneyUtils.ZERO, BigDecimal::add);

        return new OrderHistoryBucketResponse(
            periodType,
            label,
            periodStart,
            periodEnd,
            sortedOrders.size(),
            paidOrderCount,
            deliveredOrderCount,
            cancelledOrderCount,
            MoneyUtils.money(salesTotal),
            sortedOrders.stream().map(apiMapper::toOrder).toList()
        );
    }

    private LocalDate toBusinessDate(Instant timestamp, ZoneId zone) {
        ZonedDateTime zonedDateTime = timestamp.atZone(zone);
        LocalDate businessDate = zonedDateTime.toLocalDate();
        if (zonedDateTime.toLocalTime().isBefore(BUSINESS_DAY_CUTOFF)) {
            businessDate = businessDate.minusDays(1);
        }
        return businessDate;
    }

    private ZonedDateTime businessDateStart(LocalDate businessDate, ZoneId zone) {
        return businessDate.atTime(BUSINESS_DAY_CUTOFF).atZone(zone);
    }
}

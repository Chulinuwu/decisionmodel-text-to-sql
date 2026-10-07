// Fixed analysis semantics. Modified z-score after Iglewicz and Hoaglin (1993): 0.6745 rescales MAD to a normal
// standard deviation; 1.253314 does the same for mean absolute deviation, the fallback scale when MAD is 0.
export const anomalyRules = { madScale: 0.6745, meanAdScale: 1.253314, threshold: 3.5, minimumUnits: 8 };
// ponytail: a single relative share; groups whose previous value is below 5% of the largest previous group are too
// small for a meaningful percentage. Upgrade path: an absolute minimum base per measure.
export const changeRules = { tinyBaseShare: 0.05 };
// ponytail: one global rule over order volume. A month is complete when it has at least 10% of the median monthly
// volume. Upgrade path: per-relation coverage windows.
export const coverageRules = { completeShareOfMedian: 0.1 };
// Record-level anomaly units must be unique per row of their relation (reviews.review_id is not unique in Olist).
export const recordKeys: Partial<Record<string, string>> = { orders: 'order_id', products: 'product_id', sellers: 'seller_id', customers: 'customer_id' };

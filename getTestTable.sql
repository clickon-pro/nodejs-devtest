WITH top_cyty_by_revenue AS (
    SELECT vehicle_id, city, sum(revenue) AS total_revenue, count(*) AS total_rides
    FROM rides
    GROUP BY vehicle_id, city
), top_revenue_of_ride AS (
    SELECT
            vehicle_id,
            MAX(revenue) AS top_revenue_of_ride,
            ROW_NUMBER() OVER(PARTITION BY vehicle_id ORDER BY revenue DESC) AS sortrow
    FROM rides
    GROUP BY vehicle_id, revenue
), top_user_by_vehicle_revenue AS (
    SELECT
        vehicle_id,
        rider_id,
--      SUM(revenue) AS sum_revenue_by_vehicle,
        ROW_NUMBER() OVER(PARTITION BY vehicle_id ORDER BY SUM(revenue) DESC) AS sortrow
    FROM rides
    GROUP BY vehicle_id, rider_id
), vehicle_used_dates AS (
    SELECT
        vehicle_id,
        MIN(start_time::date) AS first_ride,
--      начало поездки берём или конец? Наверное нужен старт последней поездки...
--      MAX(end_time::date) AS last_ride
        MAX(start_time::date) AS last_ride
    FROM rides
    GROUP BY vehicle_id
)
SELECT
    vehicles.id AS vehicles_id, vehicles.type AS vehicles_type, vehicles.ext->'color' AS vehicles_color,
--  top_cyty_by_revenue.city, -- странно, так как есть ключ, что город авто совпадает с городом поездки, т.е. по сути нет топового города по потраченным деньгам пользователя, по-сути получается это город из транспортного средства...
--  тогда можно использовать город из vehicles а в top_cyty_by_revenue убрать группировку по городу и выборку city.
    vehicles.city AS top_city_by_revenue,
    rider_info.name AS top_user_by_revenue,
    top_revenue_of_ride.top_revenue_of_ride,
    top_cyty_by_revenue.total_revenue,
    top_cyty_by_revenue.total_rides,
    vehicle_used_dates.first_ride,
    vehicle_used_dates.last_ride
FROM vehicles, top_revenue_of_ride, vehicle_used_dates, top_cyty_by_revenue,
     top_user_by_vehicle_revenue LEFT JOIN users AS rider_info ON (
            rider_info.id = top_user_by_vehicle_revenue.rider_id
     )
WHERE top_revenue_of_ride.vehicle_id = vehicles.id
AND top_revenue_of_ride.sortrow = 1
AND top_cyty_by_revenue.vehicle_id = vehicles.id
AND top_user_by_vehicle_revenue.vehicle_id = vehicles.id
AND top_user_by_vehicle_revenue.sortrow = 1
AND vehicle_used_dates.vehicle_id = vehicles.id
ORDER BY vehicles.id;

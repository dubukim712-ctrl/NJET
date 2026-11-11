alter table public.branches
  add column latitude double precision,
  add column longitude double precision,
  add constraint branches_coordinates_pair check (
    (latitude is null) = (longitude is null)
  ),
  add constraint branches_latitude_valid check (
    latitude is null or latitude between -90 and 90
  ),
  add constraint branches_longitude_valid check (
    longitude is null or longitude between -180 and 180
  );

begin;

update public.courses
set title = 'Christmas Watercolor Nail Art Workshop'
where slug = 'holiday-watercolor-workshop';

update public.courses
set title = 'Flower Nail Art Workshop'
where slug = 'blom-flower-watercolor-workshop';

commit;


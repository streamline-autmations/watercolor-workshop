begin;

update public.courses
set slug = 'holiday-watercolor-workshop',
    title = 'Holiday Watercolor Workshop'
where slug = 'christmas-watercolor-workshop'
   or title = 'Christmas Watercolor Workshop';

update public.courses
set slug = 'blom-flower-watercolor-workshop',
    title = 'Flower Watercolor Workshop'
where slug = 'blom-flower-workshop'
   or title = 'Flower Nail Art Workshop';

commit;


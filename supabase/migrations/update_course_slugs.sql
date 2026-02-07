begin;

update public.courses
set slug = 'holiday-watercolor-workshop',
    title = 'Christmas Watercolor Nail Art Workshop'
where slug = 'christmas-watercolor-workshop'
   or title = 'Christmas Watercolor Workshop';

update public.courses
set slug = 'blom-flower-watercolor-workshop',
    title = 'Flower Nail Art Workshop'
where slug = 'blom-flower-workshop'
   or title = 'Flower Nail Art Workshop';

commit;

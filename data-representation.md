Database Representation notes

Schedules Table:

- name (string): the name of the schedule
- active (bool): is it the current working schedule in the front end
- id: unique identifier of the schedule
- activities (one to many): the activities included within the schedule

Activities Table:

- activity_id: the unique ID of the activity that corresponds to an activity prototype (belongsTo)
- start_time (time): the time that the activity begins
- end_time (time): the time that the activity ends
- day (integer): the day that the activity occurs on
- ls_shadow (bool): will leg support shadow this activity
- support_name (string): the name of the staff member supporting the activity, shows up only for public speaking, leadership with

ActivityPrototypes Table:

- name (string): the name of the activity
- duration (time): the length of the activity in hours
- required (bool): is this activity required to be performed by any given LEG
- type (string): the type of activity 
- preferred_days (enum of integers): the days that this activity is preferred to be scheduled on
- required_days (enum of integers): the days that this activity MUST be scheduled on


ANALYSIS STRUCTURING
Analysis types:
- Activity done twice (activity repetition)
    - error
- Travel time
    - warning
- Leg double-scheduled (activity overlap)
    - error
- Activity not scheduled (activity requirement)
    - error
- Activity preferred days
    - warning
- Schedule density
    - info
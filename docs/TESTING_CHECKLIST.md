# GoalSync testing checklist

Do this after setup, on your live website, with BOTH accounts. Use two different browsers (or one normal window and one private window) so you can be signed in as both people at once. Tick each line.

## A. Access and privacy
- [ ] Open the live site while signed out: you see only the login page.
- [ ] Type a deep link while signed out (for example `/history`): you are sent to the login page.
- [ ] Try to sign up with an email that is NOT on your list: you see "This email is not on the member list".
- [ ] Member 1 signs up and logs in. Member 2 signs up and logs in.
- [ ] Log out and log in again: your tasks are still there.
- [ ] Refresh the page while logged in: you stay logged in.
- [ ] "Forgot your password?" sends an email; the link opens a "Choose a new password" page; the new password works.

## B. Connect the two accounts
- [ ] Member 1: Settings > Friend connection > enter Member 2's email > Send request.
- [ ] Member 2: Settings shows the request > Accept.
- [ ] Both: Settings says "Connected with ..." and the dashboard has a friend card.

## C. Tasks
- [ ] Add a task for today (title, category, time). It appears in Today's tasks.
- [ ] Submit with an empty title: you get a clear message, nothing is saved.
- [ ] Tick the checkbox: the progress ring and "Done today" change at once. Refresh: still ticked.
- [ ] Untick it: it is pending again and the "Completed ..." time disappears.
- [ ] Edit the task (title, category, date, time). Changes stick.
- [ ] Add a task dated in the past and one in the future.
- [ ] Add a task with "Repeat daily": 30 tasks are created. Do it again with the same title and date: nothing new is added.
- [ ] Delete a task: a confirmation appears; Cancel keeps it; Delete removes it.
- [ ] Delete a repeating task: you can choose "this and later repeats".

## D. History and calendar
- [ ] Past History opens on yesterday. "Today", "A week ago", the date box, the arrows and the calendar all change the day.
- [ ] Pick a date in a previous month and a previous year (use the month/year boxes on the calendar).
- [ ] The day summary (scheduled, completed, pending, percent) matches the list.
- [ ] Completed tasks show their completion time.
- [ ] "Status history for this day" lists added / completed / marked pending again.
- [ ] Edit a past task: the change shows when you reopen that day.
- [ ] Calendar dots: one colour for days with pending tasks, another for days with completed tasks.

## E. Charts
- [ ] Analytics with no tasks in range shows friendly empty messages, not broken charts.
- [ ] Switch between Last 7 days, Last 30 days, This month, Last month, Custom, All time: every chart changes.
- [ ] Add or complete a task, return to Analytics: numbers changed.
- [ ] "You vs friend" uses the same dates for both people.

## F. Friend view (read-only)
- [ ] Member 1 opens Friend's View: sees Member 2's name, ring, counts, categories, last 14 days, and can pick any past date.
- [ ] There are no checkboxes, edit buttons or delete buttons on the friend's tasks.
- [ ] Member 2 adds a task: Member 1 sees it after refreshing (or after switching back to the tab).
- [ ] Neither person can change the other's tasks.

## G. Appearance
- [ ] Member 1 picks Dark + Ocean Blue; Member 2 stays Light + Forest Green. Each keeps their own after logging out and in.
- [ ] Each of the 6 colour themes changes buttons, rings, charts and the selected menu item.
- [ ] Light, Dark and System modes work. System follows your device setting.
- [ ] The sun/moon button in the header cycles Light, Dark, System.

## H. Phone
- [ ] On a phone: bottom menu appears, "+" button adds a task, no sideways scrolling, charts readable, calendar easy to tap.

## I. Extra security check (optional but recommended)
- [ ] In Supabase, open Table Editor > tasks. A warning that "RLS is disabled" must NOT be shown on any table.
- [ ] Open your live site's source or network tab: no `service_role` / secret key appears anywhere.

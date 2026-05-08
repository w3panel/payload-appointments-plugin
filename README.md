> [!Warning]
> This plugin is a WIP and currently testing.

# Payload plugin to add appointment scheduling to your Payload app.

This plugin allows you to add appointment scheduling capabilities to your payload app. It provides:

- Services and Appointments collections.
- An Appointment schedule calendar view.
- Opening times global (legacy).
- Optional per-host schedules with multi-shift days.
- Optional host-specific service pricing & payment configuration.

### Appointments Schedule View For Everyone

![Appointments List day](./images/appointments-schedule-day.png)

### Appointments Schedule View For Logged In User

![Appointments List week](./images/appointments-schedule-me-day.png)

### Dashboard View

![Dashboard](./images/dashboard.png)

## Installation

#### 1. install

```
npm i payload-appointments-plugin
pnpm install payload-appointments-plugin
yarn add payload-appointments-plugin
```

#### 2. add fields to users collection

```typescript
const Users: CollectionConfig = {
  // ...
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'First name',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last name',
    },
    {
      name: 'roles',
      type: 'select',
      options: [
        {
          value: 'admin',
          label: 'Admin',
        },
        {
          value: 'customer',
          label: 'Customer',
        },
      ],
    },
    {
      name: 'roles',
      type: 'select',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
      ],
    },
    {
      name: 'appointments',
      type: 'join',
      collection: 'appointments',
      defaultLimit: 0,
      maxDepth: 999,
      on: 'customer',
    },
  ],
};

export default Users;
```

#### 3. add to config

```typescript
import appointments from 'payload-appointments-plugin';

export default buildConfig({
  /* ... */
  plugins: [
    appointmentsPlugin({
      // Enable per-host schedules embedded on your host collection (e.g. doctors).
      scheduling: {
        mode: 'embeddedOnHost',
        hostScheduleFieldPath: 'appointments.schedule',
        fallbackToGlobalOpeningTimes: true,
      },
      // Enable host-specific service configuration via join collection.
      hostServices: {
        hostServiceConfigSlug: 'hostServiceConfigs',
        // If true, appointment booking only allows services enabled for that host.
        requireEnabledServicesOnly: true,
      },
    }),
  ],
  /* ... */
});
```

## Doctors booking (apps/web style integration)

If your app uses an existing `doctors` collection as the host, configure the plugin like this:

```ts
appointmentsPlugin({
  hostCollectionSlug: 'doctors',
  registerHostCollection: false,
  scheduling: {
    mode: 'embeddedOnHost',
    hostScheduleFieldPath: 'appointments.schedule',
    fallbackToGlobalOpeningTimes: true,
  },
  hostServices: {
    hostServiceConfigSlug: 'hostServiceConfigs',
    requireEnabledServicesOnly: true,
  },
})
```

### Where schedules live
- Each doctor will have `appointments.schedule` injected automatically by the plugin.\n
- Admin path: `Doctors` → (doctor doc) → `appointments.schedule` → `weekly.<day>.shifts[]`.\n

### Host-specific service pricing
- Create `Host Service Configs` docs to enable/price services per doctor.\n
- Each row is unique per `(host, service)` via the auto-generated `key = \"<hostId>:<serviceId>\"`.\n

## Migration notes (legacy -> per-host schedules + host-priced services)

### Schedules
- **Legacy**: Global `openingTimes` + (optional) host `customHours` single window per day.\n
- **New**: Host embedded schedule with `weekly.<day>.shifts[]`.\n
\n
Recommended migration approach:\n
1. Enable `scheduling.mode: 'embeddedOnHost'`.\n
2. For each host:\n
   - If they previously used `customHours.<day>.start/end`, convert each day into `shifts=[{ start, end }]`.\n
   - If they had no custom hours, optionally copy the legacy global `openingTimes` window into their schedule.\n
3. Once all hosts are migrated, set `fallbackToGlobalOpeningTimes: false` (and optionally `requireHostSchedule: true`).\n
\n
### Services pricing/payment\n
- **Legacy**: payment/pricing fields live directly on `services`.\n
- **New**: create one `hostServiceConfigs` doc per (host, service) with:\n
  - `enabled`, `price`, `paidService`, `paymentRequired`, deposits, and platform fee.\n
\n
Suggested migration:\n
1. Create `hostServiceConfigs` docs for each host+service pair.\n
2. Copy price/payment fields from the service catalog as initial defaults.\n
3. After verifying payment calculations, treat the service catalog as a reusable template and manage pricing per host.\n

#### 4. add email config

follow instructions on [PayloadCMS Email Docs](https://payloadcms.com/docs/email/overview)

## Todo?

- [x] Appointments collection
  - [x] Appointment type, Host, Customer, Services, Title, Start date/time, End date/time
  - [x] Appointment type is appointment or blockout (lunch, break, interview, meeting, day off? etc.)
  - [x] Endpoint for getting available time slots
- [ ] Add new properties/attributes to default auth collection
  - [x] Taking appointments checkbox
  - [x] Preffered name
  - [ ] Calendar subscription
- [x] Services collection for ...services
  - [x] Title
  - [x] Description
  - [x] Duration
  - [x] Cost/Price
    - [ ] Variable cost (per hour... etc.)
- [ ] Emails
  - [ ] Email config (Will need to be added by the dev)
  - [ ] React email templates
    - [ ] Appointment created email
      - [ ] Add iCal link/file to email
    - [ ] Appointment updated email
      - [ ] Add iCal link/file to email
    - [ ] Customer signed up email
- [ ] Custom payload views
  - [x] Appointments schedule view /appointments/schedule
  - [x] Appointments schedule view for loggined in user /appointments/schedule/me
  - [x] Charts /appointments/charts
  - [x] Marketing Campaigns /appointments/marketing-campaigns
  - [ ] ...more to come
- [ ] Endpoints
  - [x] Get available timeslots for given date, services, host
  - [ ] ...more to come
- [ ] Calendar schedule view
  - [x] Ability to update appointment from calendar view
  - [ ] Ability to add appointments by clicking/tapping slot in calendar
    - [x] Add appointments using Payload Drawer
    - [ ] Get start date and time from clicked slot
    - [ ] Get host from clicked slot
- [x] Opening times global
  - [x] Monday...Sunday
  - [x] Set times for different days of week
  - [x] Define if closed on that day
- [x] Add properties for showing/hiding navItems and beforeDashboard
- [ ] Add overrides for collections

A lot more I want to add. But may need some help.

create table if not exists public.tracking_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default policy',
  office_start_time time not null default '09:00',
  office_end_time time not null default '17:00',
  timezone text not null default 'Asia/Karachi',
  sample_interval_minutes integer not null default 30 check (sample_interval_minutes between 5 and 240),
  grace_period_minutes integer not null default 10 check (grace_period_minutes between 0 and 120),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.tracking_policies (name)
select 'Default policy'
where not exists (select 1 from public.tracking_policies);

create table if not exists public.employee_devices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  installation_id text not null,
  platform text not null default 'android',
  app_version text,
  device_name text,
  os_version text,
  permission_foreground boolean not null default false,
  permission_background boolean not null default false,
  location_services_enabled boolean not null default false,
  battery_optimization_note text,
  last_seen_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, installation_id)
);

create table if not exists public.location_samples (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  accuracy_meters double precision,
  altitude double precision,
  heading double precision,
  speed double precision,
  mocked boolean,
  source text not null default 'scheduled' check (source in ('scheduled', 'attendance_checkin', 'attendance_checkout', 'visit', 'manual')),
  battery_level double precision,
  is_charging boolean,
  network_type text,
  app_state text,
  installation_id text,
  upload_batch_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists location_samples_employee_recorded_idx
  on public.location_samples (employee_id, recorded_at desc);

create index if not exists location_samples_recorded_idx
  on public.location_samples (recorded_at desc);

create index if not exists employee_devices_employee_seen_idx
  on public.employee_devices (employee_id, last_seen_at desc);

alter table public.tracking_policies enable row level security;
alter table public.employee_devices enable row level security;
alter table public.location_samples enable row level security;

create policy "Employees can read active tracking policy"
  on public.tracking_policies for select
  using (is_active = true);

create policy "Employees can read their own device rows"
  on public.employee_devices for select
  using (
    exists (
      select 1 from public.employees
      where employees.id = employee_devices.employee_id
        and employees.auth_user_id = auth.uid()
    )
  );

create policy "Employees can insert their own device rows"
  on public.employee_devices for insert
  with check (
    exists (
      select 1 from public.employees
      where employees.id = employee_devices.employee_id
        and employees.auth_user_id = auth.uid()
    )
  );

create policy "Employees can update their own device rows"
  on public.employee_devices for update
  using (
    exists (
      select 1 from public.employees
      where employees.id = employee_devices.employee_id
        and employees.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.employees
      where employees.id = employee_devices.employee_id
        and employees.auth_user_id = auth.uid()
    )
  );

create policy "Employees can insert their own location samples"
  on public.location_samples for insert
  with check (
    exists (
      select 1 from public.employees
      where employees.id = location_samples.employee_id
        and employees.auth_user_id = auth.uid()
    )
  );

create policy "Employees can read their own location samples"
  on public.location_samples for select
  using (
    exists (
      select 1 from public.employees
      where employees.id = location_samples.employee_id
        and employees.auth_user_id = auth.uid()
    )
  );

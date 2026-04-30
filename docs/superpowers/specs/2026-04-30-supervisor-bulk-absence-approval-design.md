# Supervisor Bulk Absence Approval Design

## Goal

Add a bulk approval flow to the supervisor attendance screen so a teacher assigned as supervisor for a date can approve all non-rejected student absence requests for that assigned date, grade, and session in one action.

## Scope

- Add a bulk approval button to the `absence` tab in `src/app/attendance/[grade]/page.tsx`.
- Show a confirmation modal before approving.
- The confirmation modal displays the exact pending requests that will be approved in a horizontally scrollable table.
- Add a dedicated API route for bulk approval.
- Reuse the existing single-approval side effects:
  - set `AbsenceRequest.status` to `approved`
  - set `reviewedBy` and `reviewedAt`
  - upsert `Attendance` as `absent`
  - create or update `AbsenceReason`

Out of scope:

- Changing rejected or already approved requests.
- Adding new absence request statuses.
- Changing the homeroom teacher request management page.
- Changing historical approval behavior.

## Behavior

The supervisor sees `일괄승인` on the absence request tab when the selected grade has at least one pending absence request that belongs to one of the supervisor's assignments for today.

When clicked, the UI opens a modal instead of approving immediately. The modal lists every request that will be approved. The teacher confirms from this modal.

The table uses the same dense operational style as existing tables:

- Columns: `학생`, `날짜`, `시간`, `사유`, `상세`
- Cells use `whitespace-nowrap`
- The table is wrapped in `overflow-x-auto`
- Long detail text is truncated with a max width where needed
- Mobile layouts scroll horizontally instead of wrapping table cells

After confirmation succeeds:

- The modal closes.
- The absence request list refreshes.
- The pending count badge refreshes.
- The current attendance seat data refreshes, so approved absence indicators reflect the new state.

## Authorization

The server is authoritative.

The bulk API accepts `grade`, `date`, and `sessionType`. It verifies that the authenticated teacher is assigned in `SupervisorAssignment` for that exact `date + grade + sessionType`.

Admins may pass the general authentication helper as they do elsewhere, but this bulk supervisor action still requires a matching supervisor assignment. This keeps the feature aligned with the user request: the button is for the teacher assigned as supervisor on that date.

If the teacher is not assigned for the requested slot, the API returns `403`.

## Data Selection

Bulk approval targets only:

- `AbsenceRequest.status = pending`
- `AbsenceRequest.date = requested date`
- `AbsenceRequest.sessionType = requested sessionType`
- `AbsenceRequest.student.grade = requested grade`
- `AbsenceRequest.student.isActive = true`

Rejected requests are excluded. Already approved requests are excluded because there is no work to perform.

## API Design

Add:

`POST /api/attendance/absence-requests/bulk-approve`

Request body:

```json
{
  "grade": 2,
  "date": "2026-04-30",
  "sessionType": "night"
}
```

Success response:

```json
{
  "success": true,
  "approvedCount": 3,
  "approvedIds": [10, 11, 12]
}
```

If there are no pending requests, return success with `approvedCount: 0`.

## Transaction

The API performs the full approval in a single transaction.

For each pending request:

1. Update the request to `approved`.
2. Upsert the matching attendance record as `absent`.
3. Upsert the absence reason for the attendance record.

The transaction prevents partially approved batches.

## UI State

The page already has:

- `absenceData` for the displayed requests
- `pendingCountData` for the tab badge
- `data` for current attendance seats

Add derived bulk candidates from `absenceData.requests`, filtered to `pending` and to the supervisor's current session assignment for today.

Add state:

- `showBulkApproveModal`
- `isBulkApproving`

The button is disabled while approving or when no bulk candidates exist.

## Error Handling

- Invalid input returns `400`.
- Unauthorized or not assigned returns `403`.
- Network/API failures show an alert and leave the modal open.
- A successful zero-count response closes the modal and refreshes data.

## Testing

Add focused automated coverage for the bulk approval behavior. The tests should verify:

- A supervisor assigned to the requested date, grade, and session can approve all pending requests in that slot.
- Rejected requests are not modified.
- Already approved requests are not modified.
- Requests for other dates, grades, or sessions are not modified.
- A non-assigned teacher receives `403`.

Run the targeted test first and confirm it fails before implementation, then implement the minimal code to pass it.

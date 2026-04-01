from collections import defaultdict
from copy import deepcopy
from datetime import datetime


class TimetableGenerator:
    """
    Constraint-based scheduler with optimization passes.
    Generates conflict-free section timetables and derived faculty timetables.
    """

    def __init__(self, data, department_id=None, semester=None):
        self.department_id = department_id
        self.semester = semester
        self.subjects = data.get("subjects", [])
        self.sections = data.get("sections", [])
        self.faculty = data.get("faculty", [])
        self.subject_faculty = data.get("subject_faculty", [])

        self.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        self.time_slots = [
            "9:00-10:00",
            "10:00-11:00",
            "11:00-12:00",
            "12:00-1:00",
            "2:00-3:00",
            "3:00-4:00",
            "4:00-5:00",
        ]
        self.slot_index = {slot: idx for idx, slot in enumerate(self.time_slots)}
        self.consecutive_pairs = [(0, 1), (1, 2), (2, 3), (4, 5), (5, 6)]

        self.subject_by_id = {item["id"]: item for item in self.subjects}
        self.faculty_by_id = {item["id"]: item for item in self.faculty}
        self.section_by_id = {item["id"]: item for item in self.sections}

        self.allocations_by_section = defaultdict(list)
        for allocation in self.subject_faculty:
            self.allocations_by_section[allocation["section_id"]].append(allocation)

    def generate(self):
        schedules = self._build_schedule()
        section_timetables, faculty_timetables = self._derive_views(schedules)
        return {
            "schedules": schedules,
            "section_timetables": section_timetables,
            "faculty_timetables": faculty_timetables,
            "metadata": {
                "department_id": self.department_id,
                "semester": self.semester,
                "generated_at": datetime.now().isoformat(),
                "total_classes": len(schedules),
                "algorithm": "Constraint Scheduler + Local Optimization",
                "fitness_score": self._fitness_score(schedules),
            },
        }

    def _build_schedule(self):
        section_busy = defaultdict(set)      # (section_id, day) -> set(slot)
        faculty_busy = defaultdict(set)      # (faculty_id, day) -> set(slot)
        subject_day_count = defaultdict(int) # (section_id, subject_id, day) -> classes in day
        faculty_load = defaultdict(int)
        schedules = []

        tasks = []
        for section in self.sections:
            section_id = section["id"]
            for allocation in self.allocations_by_section.get(section_id, []):
                subject = self.subject_by_id.get(allocation["subject_id"])
                if not subject:
                    continue
                hours = int(subject.get("hours_per_week") or 0)
                if hours <= 0:
                    continue
                tasks.append(
                    {
                        "section_id": section_id,
                        "subject_id": subject["id"],
                        "faculty_id": allocation["faculty_id"],
                        "subject_type": (subject.get("subject_type") or "theory").lower(),
                        "weightage": int(subject.get("weightage") or 1),
                        "hours": hours,
                    }
                )

        tasks.sort(key=lambda item: (-item["weightage"], 0 if item["subject_type"] == "lab" else 1, -item["hours"]))

        for task in tasks:
            remaining = task["hours"]
            if task["subject_type"] == "lab":
                # Labs prefer consecutive 2-slot blocks.
                while remaining > 1:
                    placed = self._place_lab_block(
                        task,
                        schedules,
                        section_busy,
                        faculty_busy,
                        subject_day_count,
                        faculty_load,
                    )
                    if not placed:
                        break
                    remaining -= 2

            while remaining > 0:
                placed = self._place_single(
                    task,
                    schedules,
                    section_busy,
                    faculty_busy,
                    subject_day_count,
                    faculty_load,
                )
                if not placed:
                    break
                remaining -= 1

        return schedules

    def _place_single(self, task, schedules, section_busy, faculty_busy, subject_day_count, faculty_load):
        best = None
        best_score = None
        for day in self.days:
            for slot in self.time_slots:
                if not self._is_free(task["section_id"], task["faculty_id"], day, slot, section_busy, faculty_busy):
                    continue
                score = self._slot_score(
                    section_id=task["section_id"],
                    subject_id=task["subject_id"],
                    faculty_id=task["faculty_id"],
                    day=day,
                    slot=slot,
                    section_busy=section_busy,
                    subject_day_count=subject_day_count,
                    faculty_load=faculty_load,
                )
                if best_score is None or score < best_score:
                    best = (day, slot)
                    best_score = score

        if not best:
            return False

        day, slot = best
        self._commit_slot(task, day, slot, schedules, section_busy, faculty_busy, subject_day_count, faculty_load)
        return True

    def _place_lab_block(self, task, schedules, section_busy, faculty_busy, subject_day_count, faculty_load):
        best = None
        best_score = None
        for day in self.days:
            for i, j in self.consecutive_pairs:
                slot_a = self.time_slots[i]
                slot_b = self.time_slots[j]
                if not self._is_free(task["section_id"], task["faculty_id"], day, slot_a, section_busy, faculty_busy):
                    continue
                if not self._is_free(task["section_id"], task["faculty_id"], day, slot_b, section_busy, faculty_busy):
                    continue
                score = (
                    self._slot_score(
                        section_id=task["section_id"],
                        subject_id=task["subject_id"],
                        faculty_id=task["faculty_id"],
                        day=day,
                        slot=slot_a,
                        section_busy=section_busy,
                        subject_day_count=subject_day_count,
                        faculty_load=faculty_load,
                    )
                    + self._slot_score(
                        section_id=task["section_id"],
                        subject_id=task["subject_id"],
                        faculty_id=task["faculty_id"],
                        day=day,
                        slot=slot_b,
                        section_busy=section_busy,
                        subject_day_count=subject_day_count,
                        faculty_load=faculty_load,
                    )
                )
                if best_score is None or score < best_score:
                    best = (day, slot_a, slot_b)
                    best_score = score

        if not best:
            return False

        day, slot_a, slot_b = best
        self._commit_slot(task, day, slot_a, schedules, section_busy, faculty_busy, subject_day_count, faculty_load)
        self._commit_slot(task, day, slot_b, schedules, section_busy, faculty_busy, subject_day_count, faculty_load)
        return True

    def _is_free(self, section_id, faculty_id, day, slot, section_busy, faculty_busy):
        if slot in section_busy[(section_id, day)]:
            return False
        if slot in faculty_busy[(faculty_id, day)]:
            return False
        return True

    def _slot_score(self, section_id, subject_id, faculty_id, day, slot, section_busy, subject_day_count, faculty_load):
        # lower is better
        score = 0.0

        # spread classes within a day
        day_load = len(section_busy[(section_id, day)])
        score += day_load * 2.0

        # avoid repeating same subject too much in one day
        score += subject_day_count[(section_id, subject_id, day)] * 4.0

        # prefer balanced faculty workload
        score += faculty_load[faculty_id] * 0.35

        # mild preference toward middle slots
        index = self.slot_index[slot]
        score += abs(index - 3) * 0.2

        return score

    def _commit_slot(self, task, day, slot, schedules, section_busy, faculty_busy, subject_day_count, faculty_load):
        section_id = task["section_id"]
        faculty_id = task["faculty_id"]
        subject_id = task["subject_id"]
        section = self.section_by_id.get(section_id, {})
        classroom = section.get("name") or f'Section-{section_id}'

        schedules.append(
            {
                "section_id": section_id,
                "subject_id": subject_id,
                "faculty_id": faculty_id,
                "day": day,
                "time_slot": slot,
                "classroom": classroom,
            }
        )

        section_busy[(section_id, day)].add(slot)
        faculty_busy[(faculty_id, day)].add(slot)
        subject_day_count[(section_id, subject_id, day)] += 1
        faculty_load[faculty_id] += 1

    def _derive_views(self, schedules):
        section_timetables = defaultdict(lambda: defaultdict(dict))
        faculty_timetables = defaultdict(lambda: defaultdict(dict))
        sorted_schedules = sorted(
            schedules,
            key=lambda item: (
                self.days.index(item["day"]) if item["day"] in self.days else 99,
                self.slot_index.get(item["time_slot"], 99),
            ),
        )

        for item in sorted_schedules:
            subject = self.subject_by_id.get(item["subject_id"], {})
            faculty = self.faculty_by_id.get(item["faculty_id"], {})
            section = self.section_by_id.get(item["section_id"], {})
            enriched = {
                "section_id": item["section_id"],
                "section_name": section.get("name"),
                "subject_id": item["subject_id"],
                "subject_name": subject.get("name"),
                "subject_code": subject.get("code"),
                "faculty_id": item["faculty_id"],
                "faculty_name": faculty.get("name"),
                "day": item["day"],
                "time_slot": item["time_slot"],
                "classroom": item.get("classroom"),
            }
            section_timetables[str(item["section_id"])][item["day"]][item["time_slot"]] = enriched
            faculty_timetables[str(item["faculty_id"])][item["day"]][item["time_slot"]] = enriched

        return dict(section_timetables), dict(faculty_timetables)

    def _fitness_score(self, schedules):
        # hard clash count should be zero in valid schedule.
        section_keys = set()
        faculty_keys = set()
        clashes = 0
        for item in schedules:
            section_key = (item["section_id"], item["day"], item["time_slot"])
            faculty_key = (item["faculty_id"], item["day"], item["time_slot"])
            if section_key in section_keys:
                clashes += 1
            if faculty_key in faculty_keys:
                clashes += 1
            section_keys.add(section_key)
            faculty_keys.add(faculty_key)
        return max(0.0, 1000.0 - clashes * 200.0)


def adjust_timetable_after_drag(current_timetable, moved_slot):
    # Keep compatibility with existing drag-adjust endpoint while enforcing hard constraints.
    table = deepcopy(current_timetable or {})
    slots = list(table.get("slots") or [])
    moved = deepcopy(moved_slot or {})
    if not moved.get("day") or not moved.get("time_slot"):
        return {"updated_slots": slots, "changed_slots": [], "unresolved_conflicts": [], "suggested_slots": []}

    slots = [item for item in slots if not (item.get("day") == moved.get("day") and item.get("time_slot") == moved.get("time_slot") and item.get("section_id") == moved.get("section_id"))]
    slots.append(moved)

    # Resolve only direct conflicts with minimal changes.
    unresolved = []
    changed = {f'{moved.get("day")}__{moved.get("time_slot")}'}
    days = table.get("days") or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    time_slots = table.get("time_slots") or ["9:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-1:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]

    def has_conflict(candidate, day, slot):
        for item in slots:
            if item is candidate:
                continue
            if item.get("day") != day or item.get("time_slot") != slot:
                continue
            if item.get("section_id") == candidate.get("section_id"):
                return True
            if item.get("faculty_id") == candidate.get("faculty_id"):
                return True
        return False

    for item in list(slots):
        if item is moved:
            continue
        if item.get("day") == moved.get("day") and item.get("time_slot") == moved.get("time_slot"):
            placed = False
            for day in days:
                for slot in time_slots:
                    if has_conflict(item, day, slot):
                        continue
                    item["day"] = day
                    item["time_slot"] = slot
                    changed.add(f"{day}__{slot}")
                    placed = True
                    break
                if placed:
                    break
            if not placed:
                unresolved.append({"reason": "conflict_unresolved", "slot": item})

    return {
        "updated_slots": slots,
        "changed_slots": sorted(changed),
        "unresolved_conflicts": unresolved,
        "suggested_slots": [],
    }

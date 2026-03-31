import random
import numpy as np
from datetime import datetime


class TimetableGenerator:
    """
    AI-Powered Timetable Generator using Genetic Algorithm
    """

    def __init__(self, data, department_id=None, semester=None):
        # Store metadata
        self.department_id = department_id
        self.semester = semester

        # Core data
        self.subjects = data.get('subjects', [])
        self.faculty = data.get('faculty', [])
        self.classrooms = data.get('classrooms', [])
        self.constraints = data.get('constraints', [])
        self.students = data.get('students', [])

        # Timetable structure
        self.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        self.time_slots = [
            '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-1:00', '2:00-3:00', '3:00-4:00', '4:00-5:00'
        ]

        # GA parameters
        self.population_size = 50
        self.generations = 100
        self.mutation_rate = 0.1
        self.crossover_rate = 0.8

    # --------------------------------------------------
    # MAIN GENERATION
    # --------------------------------------------------
    def generate(self):
        print("Starting Genetic Algorithm Timetable Generation...")

        population = self.initialize_population()
        best_solution = None
        best_fitness = float('-inf')

        for generation in range(self.generations):
            fitness_scores = [self.calculate_fitness(c) for c in population]

            best_idx = np.argmax(fitness_scores)
            if fitness_scores[best_idx] > best_fitness:
                best_fitness = fitness_scores[best_idx]
                best_solution = population[best_idx].copy()

            selected = self.selection(population, fitness_scores)
            offspring = self.crossover(selected)
            population = self.mutation(offspring)

        return self.convert_to_schedule(best_solution)

    # --------------------------------------------------
    # INITIAL POPULATION
    # --------------------------------------------------
    def initialize_population(self):
        population = []

        for _ in range(self.population_size):
            chromosome = []

            for subject in self.subjects:
                hours = subject.get('hours_per_week', 4)

                for _ in range(hours):
                    chromosome.append({
                        'subject_id': subject['id'],
                        'faculty_id': self.assign_faculty(subject),
                        'classroom_id': random.choice(self.classrooms)['id'] if self.classrooms else None,
                        'day': random.choice(self.days),
                        'time_slot': random.choice(self.time_slots)
                    })

            population.append(chromosome)

        return population

    def assign_faculty(self, subject):
        eligible = [
            f for f in self.faculty
            if f.get('department_id') == subject.get('department_id')
        ]
        return random.choice(eligible)['id'] if eligible else None

    # --------------------------------------------------
    # FITNESS FUNCTION
    # --------------------------------------------------
    def calculate_fitness(self, chromosome):
        score = 1000.0

        score -= self.check_faculty_conflicts(chromosome) * 100
        score -= self.check_classroom_conflicts(chromosome) * 100
        score -= self.check_gaps(chromosome) * 10
        score -= self.check_workload_balance(chromosome) * 5

        return max(score, 0)

    def check_faculty_conflicts(self, chromosome):
        seen = set()
        conflicts = 0

        for g in chromosome:
            key = (g['faculty_id'], g['day'], g['time_slot'])
            if key in seen:
                conflicts += 1
            seen.add(key)

        return conflicts

    def check_classroom_conflicts(self, chromosome):
        seen = set()
        conflicts = 0

        for g in chromosome:
            key = (g['classroom_id'], g['day'], g['time_slot'])
            if key in seen:
                conflicts += 1
            seen.add(key)

        return conflicts

    def check_gaps(self, chromosome):
        gaps = 0
        grouped = {}

        for g in chromosome:
            key = (g['faculty_id'], g['day'])
            grouped.setdefault(key, []).append(g['time_slot'])

        for slots in grouped.values():
            slots = sorted(slots, key=self.time_slots.index)
            for i in range(len(slots) - 1):
                if self.time_slots.index(slots[i + 1]) - self.time_slots.index(slots[i]) > 1:
                    gaps += 1

        return gaps

    def check_workload_balance(self, chromosome):
        load = {}

        for g in chromosome:
            load[g['faculty_id']] = load.get(g['faculty_id'], 0) + 1

        if not load:
            return 0

        avg = sum(load.values()) / len(load)
        return sum((v - avg) ** 2 for v in load.values()) / len(load)

    # --------------------------------------------------
    # GA OPERATORS
    # --------------------------------------------------
    def selection(self, population, fitness):
        selected = []
        for _ in range(len(population)):
            i, j = random.sample(range(len(population)), 2)
            selected.append(population[i] if fitness[i] > fitness[j] else population[j])
        return selected

    def crossover(self, population):
        offspring = []

        for i in range(0, len(population) - 1, 2):
            p1, p2 = population[i], population[i + 1]
            if random.random() < self.crossover_rate:
                point = random.randint(1, min(len(p1), len(p2)) - 1)
                offspring.append(p1[:point] + p2[point:])
                offspring.append(p2[:point] + p1[point:])
            else:
                offspring.extend([p1, p2])

        return offspring

    def mutation(self, population):
        for chrom in population:
            if chrom and random.random() < self.mutation_rate:
                g = random.choice(chrom)
                g['day'] = random.choice(self.days)
                g['time_slot'] = random.choice(self.time_slots)
        return population

    # --------------------------------------------------
    # OUTPUT FORMAT
    # --------------------------------------------------
    def convert_to_schedule(self, chromosome):
        fitness = self.calculate_fitness(chromosome)

        schedules = []
        for gene in chromosome:
            schedules.append({
                'day': gene['day'],
                'time_slot': gene['time_slot'],
                'subject_id': gene['subject_id'],
                'faculty_id': gene['faculty_id'],
                'classroom_id': gene['classroom_id'],
                'student_group': 'All'
            })

        return {
            'schedules': schedules,
            'metadata': {
                'department_id': self.department_id,
                'semester': self.semester,
                'generated_at': datetime.now().isoformat(),
                'total_classes': len(schedules),
                'algorithm': 'Genetic Algorithm',
                'fitness_score': fitness
            }
        }


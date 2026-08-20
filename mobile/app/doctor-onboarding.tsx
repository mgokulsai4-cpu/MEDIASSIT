import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { TextField } from '../src/ui/TextField';
import { radii, spacing, typography } from '../src/ui/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_SLOTS = ['09:00 AM', '10:30 AM', '02:00 PM'];
const DEFAULT_SCHEDULE = Object.fromEntries(DAYS.map((day) => [day, day === 'Sunday' ? '' : DEFAULT_SLOTS.join(', ')])) as Record<string, string>;
const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Orthopedic Specialist', 'Gynecologist', 'Neurologist', 'Dermatologist', 'Pediatrician', 'ENT Specialist', 'Pulmonologist', 'Endocrinologist', 'Other'];
const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Gynecology', 'Neurology', 'Dermatology', 'Pediatrics', 'ENT', 'Pulmonology', 'Endocrinology', 'Other'];

function parseSlots(value?: string) {
  return (value ?? '').split(',').map((slot) => slot.trim()).filter(Boolean);
}

function parseOptionalNumber(value: string, label: string, max?: number): { value: number; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { value: 0 };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return { value: 0, error: `${label} must be a number.` };
  if (max !== undefined && parsed > max) return { value: 0, error: `${label} must be ${max} or less.` };
  return { value: Math.round(parsed) };
}

function buildTimeChoices() {
  const slots: string[] = [];
  for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    slots.push(`${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`);
  }
  return slots;
}

const TIME_CHOICES = buildTimeChoices();

export default function DoctorOnboardingScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEditing = edit === 'true';
  const { theme } = useSettings();
  const [specializationChoice, setSpecializationChoice] = useState('');
  const [specializationOther, setSpecializationOther] = useState('');
  const [departmentChoice, setDepartmentChoice] = useState('');
  const [departmentOther, setDepartmentOther] = useState('');
  const [hospital, setHospital] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [schedule, setSchedule] = useState<Record<string, string>>(DEFAULT_SCHEDULE);
  const [timePickerDay, setTimePickerDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<{ doctor: { specialization?: string; department?: string; hospital?: string; qualification?: string; experience?: number; consultation_fee?: number; room_number?: string; availability?: { day: string; slots?: string[] }[] } }>('/api/doctors/me');
        const doctor = res.data?.doctor;
        if (doctor?.specialization) {
          if (SPECIALIZATIONS.includes(doctor.specialization)) setSpecializationChoice(doctor.specialization);
          else { setSpecializationChoice('Other'); setSpecializationOther(doctor.specialization); }
        }
        if (doctor?.department) {
          if (DEPARTMENTS.includes(doctor.department)) setDepartmentChoice(doctor.department);
          else { setDepartmentChoice('Other'); setDepartmentOther(doctor.department); }
        }
        if (doctor?.hospital) setHospital(doctor.hospital);
        if (doctor?.qualification) setQualification(doctor.qualification);
        if (doctor?.experience !== undefined) setExperience(String(doctor.experience));
        if (doctor?.consultation_fee !== undefined) setConsultationFee(String(doctor.consultation_fee));
        if (doctor?.room_number) setRoomNumber(doctor.room_number);
        if (doctor?.availability?.length) {
          setSchedule((current) => doctor.availability!.reduce((next, row) => ({ ...next, [row.day]: row.slots?.join(', ') ?? '' }), current));
        }
        if (!isEditing && doctor?.specialization && doctor.department && doctor.hospital) router.replace('/(tabs-doctor)/dashboard');
      } catch {
        // New doctor account has no doctor profile yet.
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [isEditing, router]);

  const saveProfile = async () => {
    const specialization = (specializationChoice === 'Other' ? specializationOther : specializationChoice).trim();
    const department = (departmentChoice === 'Other' ? departmentOther : departmentChoice).trim();
    if (!specialization) {
      setError('Choose a specialization.');
      return;
    }
    if (!department) {
      setError('Choose a department.');
      return;
    }
    if (!hospital.trim()) {
      setError('Add your hospital or clinic.');
      return;
    }
    const experienceValue = parseOptionalNumber(experience, 'Years of experience', 80);
    if (experienceValue.error) {
      setError(experienceValue.error);
      return;
    }
    const feeValue = parseOptionalNumber(consultationFee, 'Consultation fee');
    if (feeValue.error) {
      setError(feeValue.error);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.patch('/api/doctors/me', {
        specialization,
        department,
        hospital: hospital.trim(),
        qualification: qualification.trim(),
        experience: experienceValue.value,
        consultation_fee: feeValue.value,
        room_number: roomNumber.trim(),
        availability: DAYS.map((day) => ({
          day,
          slots: parseSlots(schedule[day]),
        })),
        status: 'available',
      });
      if (isEditing) router.back();
      else router.replace('/(tabs-doctor)/dashboard');
    } catch (e) {
      setError((e as Error).message || 'Could not save your profile. Check the required fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickerSlots = useMemo(() => parseSlots(timePickerDay ? schedule[timePickerDay] : ''), [schedule, timePickerDay]);

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />;

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.ink }]}>{isEditing ? 'Edit your doctor profile' : 'Set up your doctor profile'}</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Patients use this to find you and book a visit.</Text>

        <Card style={styles.card}>
          <DropdownField label="Specialization" value={specializationChoice} options={SPECIALIZATIONS} onChange={(value) => { setSpecializationChoice(value); setError(''); }} theme={theme} />
          {specializationChoice === 'Other' && <TextField label="Your specialization" placeholder="Type specialization" value={specializationOther} onChangeText={(value) => { setSpecializationOther(value); setError(''); }} containerStyle={styles.field} />}
          <DropdownField label="Department" value={departmentChoice} options={DEPARTMENTS} onChange={(value) => { setDepartmentChoice(value); setError(''); }} theme={theme} />
          {departmentChoice === 'Other' && <TextField label="Your department" placeholder="Type department" value={departmentOther} onChangeText={(value) => { setDepartmentOther(value); setError(''); }} containerStyle={styles.field} />}
          <TextField label="Hospital or clinic" placeholder="Where do you practice?" value={hospital} onChangeText={(value) => { setHospital(value); setError(''); }} containerStyle={styles.field} />
          <TextField label="Qualification" placeholder="MBBS, MD, etc. (optional)" value={qualification} onChangeText={setQualification} containerStyle={styles.field} />
          <TextField label="Years of experience" placeholder="0" value={experience} onChangeText={setExperience} keyboardType="number-pad" containerStyle={styles.field} />
          <TextField label="Consultation fee" placeholder="0 (optional)" value={consultationFee} onChangeText={setConsultationFee} keyboardType="decimal-pad" containerStyle={styles.field} />
          <TextField label="Room number" placeholder="Room or desk (optional)" value={roomNumber} onChangeText={setRoomNumber} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.scheduleTitle, { color: theme.ink }]}>Appointment times</Text>
          <Text style={[styles.scheduleHint, { color: theme.inkMuted }]}>Add the times patients can book. Tap a time to remove it.</Text>
          {DAYS.map((day) => {
            const slots = parseSlots(schedule[day]);
            return (
              <View key={day} style={[styles.daySchedule, { borderColor: theme.border }]}>
                <Text style={[styles.dayLabel, { color: theme.ink }]}>{day}</Text>
                <View style={styles.schedulePills}>
                  {slots.map((slot) => (
                    <Pressable
                      key={slot}
                      onPress={() => setSchedule((current) => ({ ...current, [day]: parseSlots(current[day]).filter((item) => item !== slot).join(', ') }))}
                      style={[styles.schedulePill, { backgroundColor: theme.primarySoft }]}
                    >
                      <Text style={{ color: theme.primaryDark }}>{slot}</Text>
                      <Text style={{ color: theme.primaryDark }}> ×</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setTimePickerDay(day)} style={[styles.addTimePill, { borderColor: theme.primary }]}>
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Add time</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : null}
        <Button title={saving ? 'Saving...' : isEditing ? 'Save profile changes' : 'Open doctor dashboard'} icon="checkmark-outline" size="lg" onPress={saveProfile} loading={saving} disabled={saving} />
      </View>

      <Modal visible={timePickerDay !== null} transparent animationType="fade" onRequestClose={() => setTimePickerDay(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTimePickerDay(null)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Add a time{timePickerDay ? ` for ${timePickerDay}` : ''}</Text>
            <Text style={[styles.scheduleHint, { color: theme.inkMuted }]}>Choose a bookable slot. Times already added are dimmed.</Text>
            <ScrollView style={styles.slotScroll} contentContainerStyle={styles.slotGrid} keyboardShouldPersistTaps="handled">
              {TIME_CHOICES.map((slot) => {
                const taken = pickerSlots.includes(slot);
                return (
                  <Pressable
                    key={slot}
                    disabled={taken}
                    onPress={() => {
                      if (!timePickerDay) return;
                      setSchedule((current) => ({
                        ...current,
                        [timePickerDay]: [...new Set([...parseSlots(current[timePickerDay]), slot])].join(', '),
                      }));
                      setTimePickerDay(null);
                    }}
                    style={[
                      styles.slotChoice,
                      { backgroundColor: taken ? theme.surfaceMuted : theme.primarySoft, borderColor: taken ? theme.border : theme.primary },
                    ]}
                  >
                    <Text style={{ color: taken ? theme.inkSubtle : theme.primaryDark, fontWeight: '700' }}>{slot}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title="Cancel" variant="ghost" onPress={() => setTimePickerDay(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function DropdownField({ label, value, options, onChange, theme }: { label: string; value: string; options: string[]; onChange: (value: string) => void; theme: ReturnType<typeof useSettings>['theme'] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <Text style={[styles.dropdownLabel, { color: theme.inkMuted }]}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.dropdownButton, { backgroundColor: theme.surface, borderColor: theme.borderStrong }, pressed && styles.pressed]}>
        <Text style={{ color: value ? theme.ink : theme.inkSubtle }}>{value || `Choose ${label.toLowerCase()}`}</Text>
        <Text style={{ color: theme.primary }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={[styles.dropdownOptions, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
          {options.map((option) => (
            <Pressable key={option} onPress={() => { onChange(option); setOpen(false); }} style={({ pressed }) => [styles.dropdownOption, { borderBottomColor: theme.border }, pressed && styles.pressed]}>
              <Text style={{ color: theme.ink }}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  title: { ...typography.title },
  subtitle: { ...typography.body, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { gap: spacing.md, marginBottom: spacing.md },
  field: { marginBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  errorBanner: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  error: { ...typography.body, fontWeight: '600' },
  dropdownWrap: { marginBottom: spacing.sm },
  dropdownLabel: { ...typography.label, marginBottom: spacing.sm },
  dropdownButton: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownOptions: { borderWidth: 1, borderRadius: radii.md, marginTop: spacing.xs, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  pressed: { opacity: 0.72 },
  scheduleTitle: { ...typography.heading, marginBottom: spacing.xs },
  scheduleHint: { ...typography.caption, marginBottom: spacing.md },
  daySchedule: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  dayLabel: { ...typography.label },
  schedulePills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  schedulePill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row' },
  addTimePill: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 42, 67, 0.46)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { ...typography.title },
  slotScroll: { maxHeight: 320, marginBottom: spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  slotChoice: { minHeight: 40, minWidth: 108, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
});

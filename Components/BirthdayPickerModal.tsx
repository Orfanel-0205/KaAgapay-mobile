// components/BirthdayPickerModal.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity,
  Platform, ScrollView, StyleSheet,
} from "react-native";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_OF_WEEK = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getAge(date: Date): number {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface Props {
  visible: boolean;
  initialDate: Date | null;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export function BirthdayPickerModal({ visible, initialDate, onConfirm, onClose }: Props) {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  const defaultView = initialDate ?? new Date(today.getFullYear() - 25, today.getMonth(), 1);

  const [viewYear, setViewYear] = useState(defaultView.getFullYear());
  const [viewMonth, setViewMonth] = useState(defaultView.getMonth());
  const [pending, setPending] = useState<Date | null>(initialDate);

  useEffect(() => {
    if (visible) {
      const d = initialDate ?? new Date(today.getFullYear() - 25, today.getMonth(), 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setPending(initialDate);
    }
  }, [visible]);

  const age = pending ? getAge(pending) : null;
  const isValid = age !== null && age >= 18 && age <= 120;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const lastDayPrevMonth = getDaysInMonth(viewYear, viewMonth - 1);

  const cells: { day: number; type: "prev" | "current" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: lastDayPrevMonth - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: "current" });
  const remaining = cells.length % 7;
  if (remaining > 0)
    for (let d = 1; d <= 7 - remaining; d++)
      cells.push({ day: d, type: "next" });

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (d > today || d < new Date(today.getFullYear() - 120, 0, 1)) return;
    setPending(d);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    const nextFirstDay = new Date(viewYear, viewMonth + 1, 1);
    if (nextFirstDay > today) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function applyShortcut(yearsAgo: number) {
    const d = new Date(today.getFullYear() - yearsAgo, today.getMonth(), today.getDate());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPending(d);
  }

  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= today;
  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(today.getFullYear() - 120, 0, 1);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>Date of birth</Text>
              <Text style={s.headerSub}>Must be at least 18 years old</Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity onPress={onClose} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                <Text style={s.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (isValid && pending) { onConfirm(pending); onClose(); } }}
                disabled={!isValid}
                style={[s.doneBtn, isValid && s.doneBtnActive]}
              >
                <Text style={[s.doneBtnText, isValid && s.doneBtnTextActive]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shortcuts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.shortcuts}>
            {[
              { label: "Just turned 18", years: 18 },
              { label: "Age 25", years: 25 },
              { label: "Age 35", years: 35 },
            ].map(({ label, years }) => (
              <TouchableOpacity key={years} onPress={() => applyShortcut(years)} style={s.shortcut}>
                <Text style={s.shortcutText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Selected date preview */}
          {pending && (
            <View style={[s.preview, isValid ? s.previewValid : s.previewInvalid]}>
              <Text style={[s.previewDate, isValid ? s.previewDateValid : s.previewDateInvalid]}>
                {formatDate(pending)}
              </Text>
              {age !== null && (
                <Text style={[s.previewAge, isValid ? s.previewAgeValid : s.previewAgeInvalid]}>
                  {isValid
                    ? `${age} years old — valid age`
                    : age < 18
                      ? `${age} years old — must be 18+ to register`
                      : "Age exceeds valid range"}
                </Text>
              )}
            </View>
          )}

          {/* Calendar */}
          <View style={s.calendarWrap}>
            {/* Month navigation */}
            <View style={s.calNav}>
              <TouchableOpacity onPress={prevMonth} disabled={!canGoPrev}
                style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}>
                <Text style={s.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={s.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} disabled={!canGoNext}
                style={[s.navBtn, !canGoNext && s.navBtnDisabled]}>
                <Text style={s.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={s.dowRow}>
              {DAYS_OF_WEEK.map(d => (
                <Text key={d} style={s.dowLabel}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={s.dayGrid}>
              {cells.map((cell, i) => {
                const isCurrentMonth = cell.type === "current";
                const cellDate = isCurrentMonth
                  ? new Date(viewYear, viewMonth, cell.day)
                  : null;
                const isFuture = cellDate ? cellDate > today : true;
                const isTooOld = cellDate
                  ? cellDate < new Date(today.getFullYear() - 120, 0, 1)
                  : true;
                const isDisabled = !isCurrentMonth || isFuture || isTooOld;
                const isToday = cellDate
                  ? cellDate.toDateString() === today.toDateString()
                  : false;
                const isSelected = pending && cellDate
                  ? cellDate.toDateString() === pending.toDateString()
                  : false;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => !isDisabled && selectDay(cell.day)}
                    style={[
                      s.dayCell,
                      isSelected && s.dayCellSelected,
                      isToday && !isSelected && s.dayCellToday,
                    ]}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      s.dayText,
                      isDisabled && s.dayTextDisabled,
                      isSelected && s.dayTextSelected,
                      isToday && !isSelected && s.dayTextToday,
                    ]}>
                      {isCurrentMonth ? cell.day : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TEAL = "#1D9E75";
const TEAL_LIGHT = "#E1F5EE";
const TEAL_DARK = "#0F6E56";
const TEAL_MID = "#5DCAA5";

const s = StyleSheet.create({
  backdrop: { flex:1, justifyContent:"flex-end", backgroundColor:"rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor:"#fff",
    borderTopLeftRadius:20, borderTopRightRadius:20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: { width:36, height:4, backgroundColor:"#e5e7eb", borderRadius:2, alignSelf:"center", marginTop:10 },

  header: {
    flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between",
    paddingHorizontal:20, paddingVertical:16,
    borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:"#e5e7eb",
  },
  headerTitle: { fontSize:16, fontWeight:"600", color:"#111827", marginBottom:3 },
  headerSub: { fontSize:12, color:"#9ca3af" },
  headerActions: { flexDirection:"row", alignItems:"center", gap:8, marginTop:4 },
  cancelBtn: { fontSize:14, color:"#6b7280" },
  doneBtn: {
    paddingVertical:6, paddingHorizontal:14, borderRadius:8,
    backgroundColor:"#f3f4f6",
  },
  doneBtnActive: { backgroundColor: TEAL_LIGHT },
  doneBtnText: { fontSize:14, fontWeight:"600", color:"#9ca3af" },
  doneBtnTextActive: { color: TEAL_DARK },

  shortcuts: {
    flexDirection:"row", gap:8,
    paddingHorizontal:20, paddingVertical:12,
    borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:"#e5e7eb",
  },
  shortcut: {
    paddingVertical:7, paddingHorizontal:14,
    borderRadius:20, borderWidth:StyleSheet.hairlineWidth,
    borderColor:"#e5e7eb", backgroundColor:"#f9fafb",
  },
  shortcutText: { fontSize:12, fontWeight:"500", color:"#4b5563" },

  preview: {
    marginHorizontal:20, marginTop:12,
    paddingVertical:10, paddingHorizontal:16,
    borderRadius:10, alignItems:"center",
  },
  previewValid: { backgroundColor: TEAL_LIGHT },
  previewInvalid: { backgroundColor:"#fef2f2" },
  previewDate: { fontSize:16, fontWeight:"600" },
  previewDateValid: { color: TEAL_DARK },
  previewDateInvalid: { color:"#b91c1c" },
  previewAge: { fontSize:12, marginTop:3 },
  previewAgeValid: { color: TEAL_DARK },
  previewAgeInvalid: { color:"#b91c1c" },

  calendarWrap: { paddingHorizontal:16, paddingTop:12 },
  calNav: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  calMonthLabel: { fontSize:15, fontWeight:"600", color:"#111827" },
  navBtn: {
    width:36, height:36, borderRadius:18,
    alignItems:"center", justifyContent:"center",
    backgroundColor:"#f3f4f6",
  },
  navBtnDisabled: { opacity:0.3 },
  navBtnText: { fontSize:20, color:"#374151", lineHeight:24 },

  dowRow: { flexDirection:"row", marginBottom:4 },
  dowLabel: { flex:1, textAlign:"center", fontSize:11, fontWeight:"600", color:"#9ca3af", paddingVertical:4 },

  dayGrid: { flexDirection:"row", flexWrap:"wrap" },
  dayCell: {
    width:"14.28%", aspectRatio:1,
    alignItems:"center", justifyContent:"center",
    borderRadius:100,
  },
  dayCellSelected: { backgroundColor: TEAL },
  dayCellToday: { borderWidth:1, borderColor: TEAL_MID },
  dayText: { fontSize:13, color:"#374151" },
  dayTextDisabled: { color:"#e5e7eb" },
  dayTextSelected: { color:"#fff", fontWeight:"600" },
  dayTextToday: { color: TEAL_DARK, fontWeight:"500" },
});
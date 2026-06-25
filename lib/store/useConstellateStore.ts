"use client";

/**
 * The live demo store — client-side source of truth (Zustand), seeded from mock data.
 *
 * State resets on refresh (re-seeded deterministically). All mutations run the SAME pure
 * engine the API routes use, so flags raised live are identical to seeded ones.
 *
 * Selectors are exported as pure functions (not store methods) so components can memoize
 * derived values (`useMemo`) and avoid the "new reference every render" pitfall.
 */

import { create } from "zustand";
import type {
  Action,
  ActionType,
  CarePlan,
  Channel,
  CheckIn,
  CheckInAnswers,
  ConstellateData,
  Disposition,
  Flag,
  FlagStatus,
  ISODate,
  Measure,
  Message,
  Protocol,
  TriggerConfig,
} from "@/lib/types";
import { computeRapid3 } from "@/lib/clinical/rapid3";
import { nextLabDue } from "@/lib/clinical/labSchedule";
import { evaluateCheckin } from "@/lib/engine/evaluateCheckin";
import { evaluateTime } from "@/lib/engine/evaluateTime";
import { dedupeDrafts, flagFromDraft } from "@/lib/flags";
import { addDays } from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/labels";
import { buildSeed } from "@/lib/mock/seed";
import { heroFlareCheckInAnswers, HERO_PATIENT_ID } from "@/lib/mock/scenarios";
import { patientCheckIns, patientLatestMeasure } from "@/lib/store/selectors";

// Re-export the pure selectors so existing component imports keep working.
export {
  actionQueue,
  patientCheckIns,
  patientMeasures,
  patientLatestMeasure,
  patientThread,
  patientFlags,
  patientStatus,
} from "@/lib/store/selectors";

// ───────────────────────── store ─────────────────────────

export interface TakeActionOptions {
  params?: Record<string, unknown>;
  note?: string;
  reason?: string;
  /** snooze duration in days (default 3). */
  snoozeDays?: number;
}

interface ConstellateState extends ConstellateData {
  _seq: number;

  /** Submit a check-in over a Channel → compute RAPID3 → run engine → raise flags. */
  submitCheckIn: (
    patientId: string,
    answers: CheckInAnswers,
    channel: Channel,
  ) => Flag[];

  /** Record an Action (+ Disposition) on a Flag, applying its side effects. */
  takeAction: (flagId: string, type: ActionType, opts?: TakeActionOptions) => void;

  /** Edit one Trigger's Thresholds on a Care Plan (provider-editable judgment). */
  editThresholds: (
    carePlanId: string,
    triggerId: string,
    patch: Partial<TriggerConfig> & { enabled?: boolean },
  ) => void;

  /** Patch Care Plan fields (rung, cadence, target, dates) from the plan editor. */
  updateCarePlan: (carePlanId: string, patch: Partial<CarePlan>) => void;

  /** Append a message to a patient's thread; `from` sets its direction (defaults to the care team). */
  sendMessage: (
    patientId: string,
    body: string,
    channel?: Channel,
    from?: "patient" | "provider",
  ) => void;

  /** Run time-driven triggers across all Care Plans as of `asOf` (the demo sweep). */
  runTimeSweep: (asOf?: ISODate) => Flag[];

  /** Convenience: submit the scripted hero flare check-in. */
  simulateHeroFlare: () => Flag[];

  /** Reset all state back to the deterministic seed. */
  resetToSeed: () => void;
}

/**
 * Timestamp for runtime entities, anchored to the demo clock (`asOf`) rather than wall
 * time — so new check-ins/flags/messages read "today" in the demo, and `seq` keeps them
 * strictly ordered after the seed.
 */
function demoStamp(asOf: ISODate, seq: number): string {
  const d = new Date(`${asOf}T20:00:00.000Z`);
  d.setUTCSeconds(d.getUTCSeconds() + seq);
  return d.toISOString();
}

function protocolFor(protocols: Protocol[], carePlan: CarePlan): Protocol {
  return protocols.find((p) => p.id === carePlan.protocolId) ?? protocols[0];
}

function defaultReason(type: ActionType): string {
  return `${ACTION_LABELS[type]} — actioned from the queue.`;
}

const CLOSING_STATUS = (type: ActionType): FlagStatus =>
  type === "snooze" ? "snoozed" : type === "dismiss" ? "dismissed" : "resolved";

export const useConstellateStore = create<ConstellateState>((set, get) => ({
  ...buildSeed(),
  _seq: 1,

  submitCheckIn: (patientId, answers, channel) => {
    const created: Flag[] = [];
    set((state) => {
      const patient = state.patients.find((p) => p.id === patientId);
      if (!patient) return {};
      const carePlan = state.carePlans.find((c) => c.id === patient.carePlanId);
      if (!carePlan) return {};
      const protocol = protocolFor(state.protocols, carePlan);
      const seq = state._seq;
      const createdAt = demoStamp(state.asOf, seq);

      const r = computeRapid3(answers.rapid3);
      const checkInId = `ci-rt-${seq}`;
      const measure: Measure = {
        id: `m-rt-${seq}`,
        checkInId,
        type: "RAPID3",
        value: r.value,
        components: r.components,
        bucket: r.bucket,
        createdAt,
      };
      const checkIn: CheckIn = {
        id: checkInId,
        patientId,
        carePlanId: carePlan.id,
        channel,
        createdAt,
        answers,
        measures: [measure],
        status: "processed",
      };

      const previousMeasure = patientLatestMeasure(state.checkIns, patientId);

      const drafts = [
        ...evaluateCheckin({
          checkIn,
          measure,
          previousMeasure,
          carePlan,
          protocol,
          patient,
        }),
        ...evaluateTime({
          carePlan,
          protocol,
          patient,
          asOf: state.asOf,
          lastCheckinAt: createdAt,
          latestBucket: measure.bucket,
        }),
      ];

      const fresh = dedupeDrafts(state.flags, drafts).map((d, i) =>
        flagFromDraft(d, `flag-rt-${seq}-${i}`, createdAt, "open"),
      );
      created.push(...fresh);

      // Inbound message mirroring the check-in (so SMS + portal share the thread).
      const inbound: Message = {
        id: `msg-rt-${seq}`,
        patientId,
        channel,
        direction: "inbound",
        body: `Check-in received — RAPID3 ${r.value} (${r.bucket})${
          answers.symptoms.symptoms.length
            ? `, reported: ${answers.symptoms.symptoms.join(", ").replace(/_/g, " ")}`
            : ""
        }.`,
        createdAt,
      };

      return {
        checkIns: [...state.checkIns, checkIn],
        messages: [...state.messages, inbound],
        flags: [...state.flags, ...fresh],
        _seq: seq + 1,
      };
    });
    return created;
  },

  takeAction: (flagId, type, opts) => {
    set((state) => {
      const flag = state.flags.find((f) => f.id === flagId);
      if (!flag) return {};
      const seq = state._seq;
      const at = demoStamp(state.asOf, seq);

      const action: Action = {
        id: `act-${seq}`,
        flagId,
        type,
        params: opts?.params,
        note: opts?.note,
        takenBy: state.provider.name,
        takenAt: at,
      };

      let carePlans = state.carePlans;
      let messages = state.messages;

      // ── side effects ──
      if (type === "order_labs") {
        carePlans = carePlans.map((cp) => {
          if (cp.id !== flag.carePlanId) return cp;
          const lastLabDate = state.asOf;
          return {
            ...cp,
            lastLabDate,
            nextLabDueDate: nextLabDue({
              drug: cp.currentRung.drug,
              startDate: cp.currentRung.startDate,
              lastDoseChangeDate: cp.currentRung.lastDoseChangeDate,
              lastLabDate,
            }),
          };
        });
      } else if (type === "request_visit") {
        carePlans = carePlans.map((cp) =>
          cp.id === flag.carePlanId
            ? { ...cp, nextVisitDate: addDays(state.asOf, 7) }
            : cp,
        );
      }

      if (type === "message_patient" || type === "schedule_call") {
        const body =
          opts?.note ??
          (type === "schedule_call"
            ? "Nurse call scheduled — we'll reach out shortly."
            : "Message sent from your care team.");
        messages = [
          ...messages,
          {
            id: `msg-act-${seq}`,
            patientId: flag.patientId,
            channel: "portal",
            direction: "outbound",
            body,
            createdAt: at,
          },
        ];
      }

      const status = CLOSING_STATUS(type);
      const disposition: Disposition | undefined =
        type === "snooze"
          ? undefined
          : {
              id: `disp-${seq}`,
              flagId,
              actionType: type,
              reason: opts?.reason ?? defaultReason(type),
              resolvedBy: state.provider.name,
              resolvedAt: at,
            };

      const flags = state.flags.map((f) =>
        f.id === flagId
          ? {
              ...f,
              status,
              disposition,
              snoozedUntil:
                type === "snooze"
                  ? addDays(state.asOf, opts?.snoozeDays ?? 3)
                  : f.snoozedUntil,
            }
          : f,
      );

      return {
        flags,
        carePlans,
        messages,
        actions: [...state.actions, action],
        _seq: seq + 1,
      };
    });
  },

  editThresholds: (carePlanId, triggerId, patch) => {
    set((state) => ({
      carePlans: state.carePlans.map((cp) =>
        cp.id === carePlanId
          ? {
              ...cp,
              thresholds: {
                ...cp.thresholds,
                [triggerId]: { ...(cp.thresholds[triggerId] ?? {}), ...patch },
              },
            }
          : cp,
      ),
    }));
  },

  updateCarePlan: (carePlanId, patch) => {
    set((state) => ({
      carePlans: state.carePlans.map((cp) =>
        cp.id === carePlanId ? { ...cp, ...patch } : cp,
      ),
    }));
  },

  sendMessage: (patientId, body, channel = "portal", from = "provider") => {
    const direction = from === "patient" ? "inbound" : "outbound";
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `msg-${direction === "inbound" ? "in" : "out"}-${state._seq}`,
          patientId,
          channel,
          direction,
          body,
          createdAt: demoStamp(state.asOf, state._seq),
        },
      ],
      _seq: state._seq + 1,
    }));
  },

  runTimeSweep: (asOf) => {
    const created: Flag[] = [];
    set((state) => {
      const sweepDate = asOf ?? state.asOf;
      let seq = state._seq;
      const at = demoStamp(sweepDate, seq);
      const fresh: Flag[] = [];

      for (const carePlan of state.carePlans) {
        const patient = state.patients.find((p) => p.id === carePlan.patientId);
        if (!patient) continue;
        const protocol = protocolFor(state.protocols, carePlan);
        const checkInsForPatient = patientCheckIns(state.checkIns, patient.id);
        const drafts = evaluateTime({
          carePlan,
          protocol,
          patient,
          asOf: sweepDate,
          lastCheckinAt: checkInsForPatient.at(-1)?.createdAt ?? null,
          latestBucket: checkInsForPatient.at(-1)?.measures[0]?.bucket,
        });
        const newcomers = dedupeDrafts(
          [...state.flags, ...fresh],
          drafts,
        ).map((d) => flagFromDraft(d, `flag-sweep-${seq++}`, at, "open"));
        fresh.push(...newcomers);
      }

      created.push(...fresh);
      return {
        flags: [...state.flags, ...fresh],
        asOf: sweepDate,
        _seq: seq,
      };
    });
    return created;
  },

  simulateHeroFlare: () => {
    return get().submitCheckIn(HERO_PATIENT_ID, heroFlareCheckInAnswers(), "sms");
  },

  resetToSeed: () => {
    set({ ...buildSeed(), _seq: 1 });
  },
}));

// components/TermsModal.tsx
//
// Resident-facing Terms & Conditions / Data Privacy / System Use modal.
//
// This is the MOBILE counterpart of the web admin's src/components/TermsModal.tsx,
// but the content is NOT a copy of it. The web modal is written for RHU staff:
// it talks about Employee Identification Cards, staff roles assigned at approval,
// and clinical record-keeping duties. None of that applies to a resident
// registering on their phone, so every section here was rewritten against what
// the resident registration flow actually does.
//
// Grounded in the backend, not assumed -- AuthController::register:
//   - ALL registrants are created with account_status 'pending'; only a Super
//     Admin approval flips it to 'active'. The response itself says
//     next_step: 'upload_id', requires_id_upload: true.
//   - A valid ID must be submitted for OCR review, and OCR never auto-approves.
//   - terms_accepted is validated ['required','accepted'] and the acceptance
//     timestamp is persisted as users.terms_accepted_at.
//   - The fields a resident actually submits are first/last name, mobile number
//     (09XXXXXXXXX), optional email, barangay, birthday, optional sex, password.
//
// The same scroll-to-the-end gate as the web modal is kept deliberately: the
// acceptance checkbox on the register screen is only meaningful if the text was
// actually put in front of the person first.
//
// NOTE FOR RHU REVIEW: the wording below was drafted from the existing staff
// terms plus the verified behaviour of the resident flow. It has not been
// reviewed by the RHU or by anyone with authority over the municipality's data
// privacy commitments. Have it reviewed before relying on it.

import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TermsModal({
  visible,
  onClose,
  onAcknowledge,
}: {
  visible: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
}) {
  const [viewedToEnd, setViewedToEnd] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const reachedEnd =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 24;

    if (reachedEnd) {
      setViewedToEnd(true);
    }
  }

  // If the content is shorter than the viewport it can never scroll, so the
  // gate would be unopenable. Treat "nothing to scroll" as already read.
  function handleContentSizeChange(_width: number, height: number) {
    if (height > 0 && height <= 480) {
      setViewedToEnd(true);
    }
  }

  function handleShow() {
    setViewedToEnd(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[88%] overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center">
                <Ionicons name="shield-checkmark" size={20} color="#0F766E" />
              </View>
              <Text className="text-base font-bold text-gray-900 flex-1">
                Terms, Data Privacy & System Use
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            ref={scrollRef}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            className="px-5"
            contentContainerStyle={{ paddingVertical: 18, gap: 18 }}
          >
            <Section title="1. Terms and Conditions">
              <Paragraph>
                The Ka-Agapay Community Health Service Hub is an official system
                of the Rural Health Units (RHU 1 & RHU 2) of the Municipality of
                Malasiqui, Pangasinan. By registering, you certify that the
                information you provide is true and correct, and that you are the
                person named on the valid ID you submit for verification.
              </Paragraph>
              <Paragraph>
                Your account stays <Bold>pending</Bold> after you register. To be
                reviewed, you must accept these terms and upload a valid ID for
                verification. Automated ID reading never approves an account on
                its own — only a Super Admin can activate it. You may sign in
                while pending, but health services stay limited until your
                account is approved.
              </Paragraph>
              <Paragraph>
                Access may be suspended or revoked for giving false information,
                sharing your account with another person, or misusing RHU
                services.
              </Paragraph>
            </Section>

            <Section title="2. Data Privacy Notice">
              <Paragraph>
                In accordance with the Data Privacy Act of 2012 (RA 10173), the
                RHU collects and processes your personal information — your name,
                mobile number, barangay, birth date, sex, optional email address,
                the ID image you upload, and the health information you provide
                or that is recorded during your consultations — solely to verify
                your identity, create your resident account, and deliver RHU
                health services to you.
              </Paragraph>
              <Paragraph>
                Your information is stored securely, accessed only by authorized
                RHU personnel, and is never sold or shared for marketing. Your ID
                image is kept for verification and audit purposes. You may
                request correction of your information through the RHU.
              </Paragraph>
            </Section>

            <Section title="3. Use of the Service">
              <Paragraph>
                Use Ka-Agapay only for your own health needs or for those of a
                person you are responsible for. Keep your password confidential
                and do not let anyone else use your account. Book appointments,
                queue tickets, and teleconsultations in good faith — repeatedly
                booking slots you do not intend to use takes them away from other
                residents.
              </Paragraph>
              <Paragraph>
                <Bold>
                  Ka-Agapay is not for medical emergencies.
                </Bold>{" "}
                If you are facing an emergency, go to the nearest health facility
                or contact emergency services directly. Teleconsultation through
                this app does not replace in-person emergency care.
              </Paragraph>
            </Section>
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-gray-200 gap-3">
            {!viewedToEnd && (
              <Text className="text-xs text-gray-500 text-center">
                Scroll to the end to continue.
              </Text>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 rounded-xl py-3.5 items-center border border-gray-300 bg-white"
              >
                <Text className="text-gray-900 font-bold text-sm">Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!viewedToEnd) return;
                  onAcknowledge();
                  onClose();
                }}
                disabled={!viewedToEnd}
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  viewedToEnd ? "bg-teal-600" : "bg-teal-300"
                }`}
              >
                <Text className="text-white font-bold text-sm">
                  I have read and understand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-bold text-gray-900">{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[13px] leading-5 text-gray-600">{children}</Text>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text className="font-bold text-gray-800">{children}</Text>;
}

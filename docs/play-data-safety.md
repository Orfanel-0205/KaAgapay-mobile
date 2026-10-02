# Google Play — Data Safety answers

What to enter in **Play Console → App content → Data safety** for Ka-Agapay.

Every answer here was checked against the code on 2 October 2026 and must agree
with the privacy notice (`ka-agapay-backend/docs/legal/privacy-policy.html`).
Play compares the two, and also compares them with the permissions in the built
app — a mismatch is the most common reason a health app is rejected.

If the app starts collecting something new, update this file, the privacy
notice, and the Play form together.

## Overview questions

| Question | Answer | Basis |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | All API traffic is HTTPS; JaaS and Gemini are HTTPS/WSS. |
| Do you provide a way for users to request that their data is deleted? | **Yes** — see the deletion section below | |

## Data types

"Collected" in Play's sense means sent off the device. "Shared" means sent to a
third party for that party's own purposes — the providers below act on
Ka-Agapay's behalf, which Play counts as **not shared**.

| Category → type | Collected | Required? | Purpose(s) | Source in the app |
|---|---|---|---|---|
| Personal info → **Name** | Yes | Required | Account management, App functionality | Registration |
| Personal info → **Email address** | Yes | Required | Account management | Registration |
| Personal info → **Phone number** | Yes | Required | Account management, App functionality (SMS reminders) | Registration |
| Personal info → **Address** | Yes | Required | App functionality (assigns the RHU) | Barangay at registration |
| Personal info → **Other info** | Yes | Required | App functionality | Birth date, sex, civil status; optional guardian and PhilHealth number |
| Health and fitness → **Health info** | Yes | Required | App functionality | Complaint, symptoms, allergies, medications, consultation records |
| Messages → **Other in-app messages** | Yes | Optional | App functionality | Messages to the assistant |
| Photos and videos → **Photos** | Yes | Optional | App functionality, Account management (ID verification) | ID upload, photos sent in chat/booking/profile |
| Audio → **Voice or sound recordings** | Yes | Optional | App functionality | Voice notes to the assistant |
| App activity → **App interactions** | Yes | Required | Analytics (service records), Fraud prevention & security | Activity log entries |
| Device or other IDs | Yes | Required | App functionality (notifications) | Expo / FCM push token |

Answer **No** for: Location (both precise and approximate — the permissions are
blocked in `app.json` and verified absent from the generated manifest),
Financial info, Contacts, Calendar, Files and docs, Web browsing, Installed
apps, App info and performance, Race and ethnicity, Political or religious
beliefs, Sexual orientation.

**Live video and audio in telemedicine calls** travel through 8x8's servers
to the other participant and are not recorded (`recording: false` in the
JaaS token). Whether Play counts unrecorded real-time calls as "collected" was
not something I could confirm, and the two possible mistakes are not equal:
under-declaring gets an app pulled, over-declaring does not. So declare
**Photos and videos → Videos** and **Audio → Voice or sound recordings** as
collected, optional, for App functionality, and tick **processed
ephemerally**, which is accurate.

**Advertising ID:** answer **No**. No bundled library declares
`com.google.android.gms.permission.AD_ID` (checked across node_modules
manifests), and the app has no advertising.

## Account deletion — currently a blocker

Play requires, for any app that lets users create an account:

1. a way to start account deletion **inside the app**, and
2. a **web page** where deletion can be requested without the app.

Neither exists yet. There is no delete-account screen and no backend route.
The privacy notice (section 5) gives the DPO request route, which can serve as
the web page once it is published, but the in-app path still has to be built.

The design decision only the RHU can make is **what deletion means for medical
records**, which the RHU is required to keep. The usual answer, and the one the
privacy notice assumes, is: close the account and revoke its sessions, delete
or anonymise everything that is not part of the medical record, and keep the
medical record for the legally required period.

## Health apps declaration

Play has a separate **Health apps** declaration under App content. Ka-Agapay
is a health service app operated for a public health unit; declare it as such
and link the privacy notice. It does not diagnose — the assistant and the
symptom grouping explicitly do not, and the notice says to book a consultation
for medical concerns.

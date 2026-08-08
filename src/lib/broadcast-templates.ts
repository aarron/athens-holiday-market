import { site } from "@/lib/site";

export type BroadcastTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

/**
 * Editable starting points adapted from past market emails. Dates/fees pull from
 * site config where possible; organizers tweak the rest each year.
 */
export function getBroadcastTemplates(): BroadcastTemplate[] {
  const day1 = site.event.days[0].label;
  const day2 = site.event.days[1].label;
  const time = site.event.timeLabel;
  const year = site.event.year;
  const signoff = "— Ansley, Brent, Jamie, Jim, Ryan and (in our hearts) Kenneth";

  return [
    {
      id: "applications-open",
      name: "Applications are open",
      subject: `${site.name} ${year} — applications are open`,
      body: `Hey there,

We hope this finds you well and making what you make! It's time to apply for the ${year} ${site.name}.

**Application deadline:** ${site.applications.closesLabel}
**Event dates:** ${day1} & ${day2}, ${time}
**Booth fee:** $75 total for both nights

[Apply for a space](${site.url}/apply)

You'll need a Google/Gmail account to fill out the application and upload photos of your work.

**Space details**

- Location: the Big City Bread Cafe courtyard and parking area. All spaces are outside and close together.
- Tents are not allowed.
- Size: 3×6 ft (with a little wiggle room).
- You must be present both nights during sale hours, and set up / take down both nights.
- Bring your own lights, extension cords, tables, chairs, tablecloths, and display items.
- Power is provided at central locations — bring your own cords and lighting.
- Rain or shine.

**Jurying & deadlines**

- Applications are reviewed by a 5-member jury.
- Notifications go out by email on a date to be announced.
- If accepted, the booth fee is due via PayPal by the payment deadline.
- A waiting list is maintained; unpaid spots go to the next artist.

We look forward to seeing your work — and your smiling faces in December.

The BCB Art Collective`,
    },
    {
      id: "accepted",
      name: "You've been accepted",
      subject: `You're in! ${site.name} ${year} 🎉`,
      body: `Hi {{first_name}},

Congratulations! You've been accepted into the ${year} ${site.name} at Big City Bread. We had SO many great applicants this year — you're one of the chosen few!

Your **$75 booth fee** is due via PayPal by the payment deadline. Watch for a PayPal payment request in the next few days and follow the prompts. We'll email you a confirmation once payment is received.

There is a waiting list for this event. If you don't pay by the deadline, your space will be offered to another artist.

An email with setup instructions will follow closer to the event.

**Important info**

- **Dates:** ${day1} & ${day2}, ${time}
- **Your space:** a 6'×3' outdoor space with little wiggle room. No tents. Booths are assigned at check-in; your Thursday space is also your Friday space.
- **Bring:** all tables, chairs, tablecloths, lighting, extension cords, and anything else to display your work.
- **Be present** during sale hours, and set up / take down BOTH nights. Please be professional, tidy, and on time.
- **Lighting:** it's a night market and it gets dark — well-lit booths sell more.
- **Weather:** rain or shine, no refunds for weather.

Booth fees are donated to local charity. Now get to work making lots of great art to sell!

${signoff}`,
    },
    {
      id: "waitlist",
      name: "Waitlist notification",
      subject: `${site.name} ${year}`,
      body: `Hi {{first_name}},

Once again we were blown away by all the talent our little market attracts. Thank you so much for spending your valuable time applying.

**We have you on the waiting list.** If one of the accepted artists can't attend, we'll contact you.

Thanks so much, and we hope you apply again next year.

${signoff}`,
    },
    {
      id: "pre-event",
      name: "Everything you need to know (pre-event)",
      subject: `Everything you need to know — ${site.name} ${year}`,
      body: `The market is almost here! Here's everything you need to know.

**Event:** ${day1} & ${day2}, ${time}. **Setup begins at 3:30pm.**

**Your space**

- A minimum 6'×3' outdoor space. Tents are not allowed.
- Provide your own tables, tablecloths, and display materials.
- Setup and teardown are required both evenings; the same space applies both nights.

**Logistics**

- Contact Jamie Voivedich for parking passes and pre-order dinner forms.
- Unload and move your vehicle before setup.
- Please be professional, punctual, and tidy.

**Lighting:** it's a nighttime market — lighting is key. Visit beforehand or check our Facebook photos to understand the space.

**Promotion:** follow and share our Facebook page. Ansley is coordinating a social campaign — send a short bio if you'd like to be featured.

**Attendance:** report cancellations immediately. Booth fees are nonrefundable; no-shows without notice won't be invited back.

See you there!

${signoff}`,
    },
  ];
}

import { MessageChecker } from "./MessageChecker";

export default function CheckMessagePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Check a message</h1>
        <p className="text-sm text-muted">
          Most job scams arrive by text, chat or email, not through job boards. Paste a recruiter message, interview invite or offer to see its red flags before you reply.
        </p>
      </div>
      <MessageChecker />
    </div>
  );
}

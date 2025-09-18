'use client'
import { useActionState } from "react";
import { sendMoneyFirstStep, sendMoneySecondStep } from "./actions";

const initialState = {
  error: null
}

export default function Home() {

  const [state, formAction, pending] = useActionState(sendMoneyFirstStep, initialState)
  const [state2, formAction2, pending2] = useActionState(sendMoneySecondStep, initialState)

  return (
    <main className="w-screen h-screen flex items-center justify-center">
      <div>
        <form action={formAction} className="bg-gray-200 px-8 py-6  rounded-2xl">
          <h1 className="text-xl text-center mb-2">First Step</h1>
          <button className="bg-orange-400 rounded-xl px-3 py-2 cursor-pointer">Send Money</button>
        </form>
        <br />
        <form action={formAction2} className="bg-gray-200 px-8 py-6  rounded-2xl">
          <h1 className="text-xl text-center mb-2">Second Step</h1>
          <button className="bg-orange-400 rounded-xl px-3 py-2 cursor-pointer">Send Money</button>
          {state2.redirectTo && (
            <p>Accept grant: <a href={state2.redirectTo}>link</a></p>
          )}
        </form>
      </div>
    </main>
  );
}

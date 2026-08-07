"use client";

import { useState } from "react";
import { SectionHeader, SectionShell, ScrollReveal } from "@/components/oliva/motion";
import { FaqItem } from "./FaqItem";
import "./faq.css";

const FAQ_ITEMS = [
  {
    id: "gratis",
    question: "¿IngeniaFood es gratuita?",
    answer: [
      "Sí.",
      "Puedes empezar de forma gratuita y descubrir la aplicación.",
      "Además, tendrás una experiencia Premium de 24 horas que podrás activar cuando tú decidas."
    ]
  },
  {
    id: "cuando-premium",
    question: "¿Cuándo empiezan mis 24 horas Premium?",
    answer: [
      "Solo cuando pulses el botón para activarlas.",
      "No empiezan al registrarte.",
      "Así puedes elegir el mejor momento para descubrir todas las funciones."
    ]
  },
  {
    id: "tarjeta",
    question: "¿Necesito introducir una tarjeta para probarla?",
    answer: [
      "No.",
      "Puedes activar tu experiencia Premium sin introducir ningún método de pago."
    ]
  },
  {
    id: "ingredientes",
    question: "¿Necesito ingredientes especiales?",
    answer: [
      "No.",
      "IngeniaFood está pensada para ayudarte a cocinar con los ingredientes que ya tienes en casa."
    ]
  },
  {
    id: "movil",
    question: "¿Funciona en móvil?",
    answer: [
      "Sí.",
      "IngeniaFood es una Progressive Web App (PWA), por lo que puedes utilizarla desde tu móvil como si fuera una aplicación, sin depender de una tienda de aplicaciones."
    ]
  },
  {
    id: "recetas",
    question: "¿La aplicación crea las recetas automáticamente?",
    answer: [
      "IngeniaFood analiza los ingredientes disponibles y te ayuda a descubrir recetas adaptadas a lo que tienes y a tus preferencias.",
      "El objetivo es ayudarte a decidir más rápido qué cocinar."
    ]
  },
  {
    id: "disponibilidad",
    question: "¿Cuándo estará disponible?",
    answer: [
      "La Beta estará disponible muy pronto.",
      "Mientras tanto, puedes conocer IngeniaFood y ser de las primeras personas en descubrirla."
    ]
  }
] as const;

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  function handleToggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <SectionShell id="faq" variant="cream" divider align="start">
      <div className="mx-auto max-w-[900px] px-6 lg:px-10">
        <SectionHeader
          title={
            <>
              Todavía puedes tener alguna duda.
              <br />
              Y queremos resolverla.
            </>
          }
          subtitle="Todo lo que necesitas saber antes de empezar con IngeniaFood."
        />

        <div className="mt-14 sm:mt-16 lg:mt-20">
          {FAQ_ITEMS.map((item, index) => (
            <ScrollReveal key={item.id} delay={80 + index * 50} variant="fade">
              <FaqItem
                id={item.id}
                question={item.question}
                answer={[...item.answer]}
                open={openId === item.id}
                onToggle={handleToggle}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

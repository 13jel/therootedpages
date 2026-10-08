import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

const SPOONFLOWER_URL =
  "https://www.spoonflower.com/profiles/therootedpages/collections?filter=designed";

export default function About() {
  usePageTitle("Om projektet");

  return (
    <div className="about-page">
      <h1>Om The Rooted Pages</h1>

      <section className="about-section">
        <h2>Detta är ett skolprojekt</h2>
        <p>
          The Rooted Pages är byggd som examinationsuppgift i systemutveckling
          på FSU25D, Medieinstitutet. Sidan demonstrerar en fullständig
          e-handelslösning — databas, inloggning, admin-panel, varukorg och
          orderhantering — men fungerar inte som en riktig butik.
        </p>
      </section>

      <section className="about-section">
        <h2>Produkter och beställningar</h2>
        <p>
          Produkterna på sidan går att lägga i varukorg och "beställa" precis
          som i en riktig butik, för att visa hela flödet från produktval till
          order. Men <strong>inga fysiska varor skickas</strong> och{" "}
          <strong>ingen riktig betalning sker</strong> — valutan "slantar" är
          påhittad för uppgiften. Dina beställningar hittar du under Mina sidor.
        </p>
      </section>

      <section className="about-section">
        <h2>Galleriet och Spoonflower</h2>
        <p>
          Till skillnad från produkterna tar jag faktiskt emot riktiga
          förfrågningar via mejl från <Link to="/gallery">galleriet</Link> — om
          du vill beställa en logotyp eller liknande hör jag gärna av mig.
        </p>
        <p>
          Mina mönster finns också på riktigt tyg och tapet i min butik på{" "}
          <a href={SPOONFLOWER_URL} target="_blank" rel="noopener noreferrer">
            Spoonflower
            <span className="sr-only"> (öppnas i ny flik)</span>
          </a>
          .
        </p>
      </section>

      <section className="about-section">
        <h2>Om dina uppgifter</h2>
        <p>
          Om du skapar ett konto och lägger en testorder sparas namn, e-post,
          adress och orderhistorik i databasen precis som i en riktig e-handel —
          det är en del av det som examineras. Uppgifterna används inte i något
          annat syfte och delas inte vidare. Hör gärna av dig om du vill att din
          data ska tas bort.
        </p>
      </section>
    </div>
  );
}

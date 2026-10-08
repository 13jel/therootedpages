import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from "../api/collections";
import AdminNav from "../components/AdminNav";

export default function AdminCollections() {
  usePageTitle("Admin – Kollektioner");

  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const editNameRef = useRef(null);
  const listHeadingRef = useRef(null);
  const editButtons = useRef({});

  useEffect(() => {
    load();
  }, []);

  // Fokus på namnfältet när man börjar redigera
  useEffect(() => {
    if (editingId !== null) editNameRef.current?.focus();
  }, [editingId]);

  // Fokus på rätt ställe när knappen man tryckte på har försvunnit
  useEffect(() => {
    if (!focusRequest) return;
    const { target, id } = focusRequest;
    const element = {
      list: listHeadingRef.current,
      "edit-button": editButtons.current[id],
    }[target];
    element?.focus();
  }, [focusRequest]);

  function requestFocus(target, id) {
    setFocusRequest({ target, id });
  }

  function load() {
    setLoading(true);
    fetchCollections()
      .then(setCollections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const createdName = name;
      await createCollection(token, { name, description });
      setName("");
      setDescription("");
      setAnnouncement(`Kollektionen ${createdName} skapades`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDescription(c.description || "");
  }

  function cancelEdit(id) {
    setEditingId(null);
    requestFocus("edit-button", id);
  }

  async function handleUpdate(id) {
    setError(null);
    try {
      await updateCollection(token, id, {
        name: editName,
        description: editDescription,
      });
      setEditingId(null);
      setAnnouncement(`Kollektionen ${editName} sparades`);
      requestFocus("edit-button", id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (
      !window.confirm(
        `Ta bort kollektionen "${c.name}"? Produkter kopplade till den blir kvar men förlorar kollektionstillhörigheten.`,
      )
    )
      return;
    setError(null);
    try {
      await deleteCollection(token, c.id);
      setAnnouncement(`Kollektionen ${c.name} togs bort`);
      requestFocus("list");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-products">
      <AdminNav />

      <h1>Admin – Kollektioner</h1>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section>
        <h2>Skapa ny kollektion</h2>
        <form onSubmit={handleCreate} className="product-form">
          <label>
            Namn
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Beskrivning
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="submit" aria-disabled={saving}>
            {saving ? "Sparar..." : "Skapa kollektion"}
          </button>
        </form>
      </section>

      <section>
        <h2 ref={listHeadingRef} tabIndex={-1}>
          Befintliga kollektioner
        </h2>
        {loading && <p role="status">Laddar...</p>}
        <ul className="admin-product-list">
          {collections.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                <form
                  className="product-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdate(c.id);
                  }}
                >
                  <label>
                    Namn
                    <input
                      ref={editNameRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Beskrivning
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Spara</button>
                    <button type="button" onClick={() => cancelEdit(c.id)}>
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                <div className="admin-product-row">
                  <span>{c.name}</span>
                  <span>
                    {c.description ? (
                      c.description
                    ) : (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Ingen beskrivning</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    ref={(el) => {
                      editButtons.current[c.id] = el;
                    }}
                    onClick={() => startEdit(c)}
                  >
                    Redigera
                    <span className="sr-only"> {c.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="danger-button"
                  >
                    Ta bort
                    <span className="sr-only"> {c.name}</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useParams, useNavigate } from "react-router-dom";

export default function UpdateAlert() {
  const [inputs, setInputs] = useState({
    topic: "",
    message: "",
    district: "",
    disLocation: "",
    adminName: ""
  });

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/alerts/${id}`);
        const data = res.data?.alert || res.data;
        setInputs({
          topic: data.topic || "",
          message: data.message || "",
          district: data.district || "",
          disLocation: data.disLocation || "",
          adminName: data.adminName || ""
        });
      } catch (err) {
        alert("Failed to load alert");
      }
    })();
  }, [id]);

  const handleChange = (e) => setInputs((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/alerts/${id}`, inputs);
      alert("Updated");
      navigate("/AdminHome/toAlerts");
    } catch (err) {
      if (err?.response?.status === 401) {
        alert("Please log in as admin");
        navigate("/AdminLogin");
        return;
      }
      alert("Update failed");
    }
  };

  return (
    <div>
      <h1>Update Message Only</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <div>
          <label>Topic</label><br />
          <input name="topic" value={inputs.topic} onChange={handleChange} disabled />
        </div>
        <div>
          <label>Message</label><br />
          <input name="message" value={inputs.message} onChange={handleChange} required />
        </div>
        <div>
          <label>District</label><br />
          <input name="district" value={inputs.district} onChange={handleChange} disabled />
        </div>
        <div>
          <label>District Location</label><br />
          <input name="disLocation" value={inputs.disLocation} onChange={handleChange} disabled />
        </div>
        <div>
          <label>Admin Type</label><br />
          <select name="adminName" value={inputs.adminName} onChange={handleChange} disabled>
            <option value="">--Select Admin--</option>
            <option value="System Admin">System Admin</option>
            <option value="Disaster Management Officer">Disaster Management Officer</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Update Message</button>
        </div>
      </form>
    </div>
  );
}

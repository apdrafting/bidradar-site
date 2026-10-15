import unittest
from scripts.collect_bids import pick, infer_trade, process_csv_data

class TestCollectBids(unittest.TestCase):
    def test_pick_helper(self):
        row = {"Solicitation_Title": " Roof Repair ", "Department": "Public Works"}
        self.assertEqual(pick(row, "solicitation title", "title"), "Roof Repair")
        self.assertEqual(pick(row, "department", "agency"), "Public Works")
        self.assertEqual(pick(row, "nonexistent"), "")

    def test_infer_trade(self):
        self.assertEqual(infer_trade("HVAC system replacement"), "HVAC")
        self.assertEqual(infer_trade("Architectural design services"), "Architecture")
        self.assertEqual(infer_trade("Electrical wiring upgrade"), "Electrical")
        self.assertEqual(infer_trade("Plumbing main line repair"), "Plumbing")
        self.assertEqual(infer_trade("Roof replacement"), "Roofing")
        self.assertEqual(infer_trade("Landscape maintenance"), "Landscaping")
        self.assertEqual(infer_trade("Asphalt paving and sidewalk repair"), "Civil")
        self.assertEqual(infer_trade("Civil engineering consultation"), "Engineering")
        self.assertEqual(infer_trade("Building renovation project"), "Construction")
        self.assertEqual(infer_trade("Generic unclassified notice"), "Unclassified")

    def test_process_csv_data_valid(self):
        sample_csv = (
            "title,description,url,due date,agency,solicitation number\n"
            '"Roof Replacement","Replacing roof","https://example.com/bids/1","2026-12-31","LA County DPW","BID-001"\n'
            '"Electrical Upgrade","Rewiring panel","https://example.com/bids/2","2026-12-31","City Power","BID-002"\n'
            '"Irrelevant Supply","Office paper purchase","https://example.com/bids/3","2026-12-31","Admin","BID-003"\n'
            '"Bad Link Job","Paving project","http://insecure.com/bids/4","2026-12-31","DPW","BID-004"\n'
        ).encode("utf-8")

        result = process_csv_data(sample_csv, "https://example.com/source.csv")
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["opportunities"]), 2)

        opp1 = result["opportunities"][0]
        self.assertEqual(opp1["title"], "Roof Replacement")
        self.assertEqual(opp1["trade"], "Roofing")
        self.assertEqual(opp1["sourceUrl"], "https://example.com/bids/1")

        opp2 = result["opportunities"][1]
        self.assertEqual(opp2["title"], "Electrical Upgrade")
        self.assertEqual(opp2["trade"], "Electrical")

    def test_process_csv_data_empty(self):
        sample_csv = "title,description,url\n".encode("utf-8")
        with self.assertRaises(ValueError):
            process_csv_data(sample_csv, "https://example.com/source.csv")

if __name__ == "__main__":
    unittest.main()

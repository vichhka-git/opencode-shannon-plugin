#!/usr/bin/env python3
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from install_global import (
    extract_array_from_key,
    extract_plugin_paths,
    insert_into_array,
    merge_plugin_path_jsonc,
)


class TestExtractArrayFromKey(unittest.TestCase):
    """Tests for extract_array_from_key function."""

    def test_simple_array(self):
        """Test extraction of simple array."""
        content = '{"plugin": ["path1", "path2"]}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertEqual(array_content.strip(), '"path1", "path2"')

    def test_array_with_comments(self):
        """Test extraction of array with inline comments."""
        content = '{"plugin": /* comment */ ["path1", "path2"]}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertIn("path1", array_content)

    def test_comment_after_bracket(self):
        """Test extraction when comment appears after [ bracket."""
        content = '{"plugin": [/* comment */ "path1", "path2"]}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertIn("path1", array_content)
        self.assertIn("/* comment */", array_content)

    def test_array_with_multiline_comments(self):
        """Test extraction of array with multi-line comments."""
        content = """{
  // This is a comment
  "plugin": [
    // this is another comment
    "path1",
    /* inline comment */
    "path2"
  ]
}"""
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertIn("path1", array_content)
        self.assertIn("path2", array_content)

    def test_comment_before_first_element(self):
        """Test extraction when comment appears after [ but before first element."""
        content = '{"plugin": [/*comment*/"someValue"]}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertIn("someValue", array_content)
        self.assertIn("/*comment*/", array_content)

    def test_comment_between_key_and_colon(self):
        """Test comment between key and colon: \"plugin\"/*comment*/:"""
        content = '{"plugin"/*comment*/: ["someValue"]}'
        result = merge_plugin_path_jsonc(content, "newPath")
        self.assertIn("/*comment*/", result)
        self.assertIn('"someValue"', result)
        self.assertIn('"newPath"', result)

    def test_multiline_comment_between_key_and_colon(self):
        """Test multi-line comment between key and colon."""
        content = '{"plugin"/**/: ["path1"]}'
        result = merge_plugin_path_jsonc(content, "newPath")
        self.assertIn("[", result)
        self.assertIn("path1", result)
        self.assertIn("newPath", result)

    def test_key_not_found(self):
        """Test when key doesn't exist."""
        content = '{"other": ["value"]}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNone(result)

    def test_empty_array(self):
        """Test extraction of empty array."""
        content = '{"plugin": []}'
        result = extract_array_from_key(content, "plugin")
        self.assertIsNotNone(result)
        array_content, array_start, end_pos = result
        self.assertEqual(array_content.strip(), "")


class TestExtractPluginPaths(unittest.TestCase):
    """Tests for extract_plugin_paths function."""

    def test_simple_strings(self):
        """Test extraction of simple paths."""
        plugin_paths_text = '"path1", "path2"'
        result = extract_plugin_paths(plugin_paths_text)
        self.assertEqual(result, ["path1", "path2"])

    def test_strings_with_comments(self):
        """Test extraction skips comments."""
        plugin_paths_text = '"path1", /* comment */ "path2"'
        result = extract_plugin_paths(plugin_paths_text)
        self.assertEqual(result, ["path1", "path2"])

    def test_escaped_quotes(self):
        """Test handling of escaped quotes within paths."""
        plugin_paths_text = '"path\\"1", "path2"'
        result = extract_plugin_paths(plugin_paths_text)
        self.assertEqual(result, ['path\\"1', "path2"])

    def test_empty_array(self):
        """Test extraction from empty array."""
        plugin_paths_text = ""
        result = extract_plugin_paths(plugin_paths_text)
        self.assertEqual(result, [])

    def test_only_comments(self):
        """Test extraction when array only has comments."""
        plugin_paths_text = "/* comment */ /* another */"
        result = extract_plugin_paths(plugin_paths_text)
        self.assertEqual(result, [])


class TestInsertIntoArray(unittest.TestCase):
    """Tests for insert_into_array function."""

    def test_insert_into_empty_array(self):
        """Test insertion into empty array."""
        result = insert_into_array("", "/new/path", 0)
        self.assertEqual(result, ' "/new/path"')

    def test_insert_after_existing_item(self):
        """Test insertion after existing item."""
        result = insert_into_array('"path1"', "/new/path", len('"path1"'))
        self.assertEqual(result, '"path1", "/new/path"')

    def test_insert_with_trailing_comma(self):
        """Test insertion when there's already a trailing comma."""
        result = insert_into_array('"path1",', "/new/path", len('"path1",'))
        self.assertEqual(result, '"path1", "/new/path"')

    def test_insert_preserves_whitespace(self):
        """Test insertion preserves whitespace before insert position."""
        result = insert_into_array('"path1", ', "/new/path", len('"path1", '))
        self.assertEqual(result, '"path1", "/new/path"')


class TestMergePluginPathJsonc(unittest.TestCase):
    """Tests for merge_plugin_path_jsonc function."""

    def test_add_new_path(self):
        """Test adding a new path to existing array."""
        content = '{"plugin": ["path1"]}'
        result = merge_plugin_path_jsonc(content, "path2")
        self.assertIn("path1", result)
        self.assertIn("path2", result)

    def test_path_already_exists(self):
        """Test when path already exists - returns original content."""
        content = '{"plugin": ["path1"]}'
        result = merge_plugin_path_jsonc(content, "path1")
        self.assertEqual(result, content)

    def test_preserves_comments(self):
        """Test that comments are preserved."""
        content = """{
  // This is a comment
  "plugin": [
    "existing/path"
    /* another comment */
  ]
}"""
        result = merge_plugin_path_jsonc(content, "/new/path")
        self.assertIn("// This is a comment", result)
        self.assertIn("/* another comment */", result)

    def test_preserves_inline_comments(self):
        """Test that inline comments are preserved."""
        content = '{"plugin": ["path1", /*comment*/ "path2"]}'
        result = merge_plugin_path_jsonc(content, "path3")
        self.assertIn("/*comment*/", result)
        self.assertIn("path3", result)

    def test_key_not_exists_returns_none(self):
        """Test when plugin key doesn't exist."""
        content = '{"other": "value"}'
        result = merge_plugin_path_jsonc(content, "path")
        self.assertIsNone(result)

    def test_empty_array(self):
        """Test insertion into empty array."""
        content = '{"plugin": []}'
        result = merge_plugin_path_jsonc(content, "path")
        self.assertIn("path", result)

    def test_trailing_comma_preserved(self):
        """Test trailing comma is handled correctly."""
        content = '{"plugin": ["path1",]}'
        result = merge_plugin_path_jsonc(content, "path2")
        self.assertIn("path1", result)
        self.assertIn("path2", result)

    def test_complex_jsonc_with_multiple_comments(self):
        """Test complex JSONC with multiple comment types."""
        content = """{
  // Leading comment
  "plugin": [ /* inline */ "existing/path", /* mid */ "another/path" /* trailing */ ]
  // Trailing comment
}"""
        result = merge_plugin_path_jsonc(content, "/new/path")
        self.assertIn("// Leading comment", result)
        self.assertIn("/* inline */", result)
        self.assertIn("/* mid */", result)
        self.assertIn("/* trailing */", result)
        self.assertIn("// Trailing comment", result)
        self.assertIn("/new/path", result)


if __name__ == "__main__":
    unittest.main()

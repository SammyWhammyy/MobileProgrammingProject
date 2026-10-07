import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";

const SearchDropDown = ({ data, onSelect, dataTitle }) => {
  const [searchText, setSearchText] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dataList, setDataList] = useState(data);
  const inputRef = React.useRef(null);

  const handleSearch = (input) => {
    setSearchText(input);

    if (input) {
      setShowDropdown(true);
      const sortedData = [...dataList].filter((item) => {
        return item.place.toUpperCase().includes(input.toUpperCase());
      });
      setFilteredData(sortedData);
    } else {
      setShowDropdown(false);
      setFilteredData([]);
    }
  };

  const handleSelect = (item) => {
    setSelectedItem(item);
    setSearchText(item.place);
    setShowDropdown(false);
    onSelect(item);
    setFilteredData([]);
    inputRef.current?.blur();
  };

  const handleSubmit = () => {
    const item = filteredData[0];
    if (item) {
      setShowDropdown(false);
      onSelect(item);
      setSelectedItem(item);
      setSearchText(item.place);
      inputRef.current?.blur();
    }
  };

  return (
    <View>
      <View>
        <Text>{dataTitle}:</Text>
      </View>

      <View>
        <TextInput
          onSubmitEditing={handleSubmit}
          ref={inputRef}
          style={{ position: "relative", zIndex: 1 }}
          placeholder="Search..."
          onChangeText={handleSearch}
          value={searchText}
          onFocus={() => console.log("INPUT FOCUSED")}
          onBlur={() => console.log("INPUT BLURRED")}
        />
      </View>
      {showDropdown && (
        <View>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={filteredData}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelect(item)}>
                <Text>{item.place}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};
export default SearchDropDown;

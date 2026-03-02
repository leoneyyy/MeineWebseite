export default function Window({ title, children, onClose }) {
  return (
    <div className="absolute top-20 left-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg w-80">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-700 p-2 rounded-t-lg">
        <span className="font-bold">{title}</span>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white px-2 rounded"
        >
          X
        </button>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}
